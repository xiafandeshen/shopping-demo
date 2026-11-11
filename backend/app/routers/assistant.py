import json
import os
import secrets
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    Address,
    AssistantConversation,
    CartItem,
    CheckoutToken,
    InventoryLock,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    User,
)
from app.schemas import AssistantMessageRequest, AssistantMessageResponse, OrderResponse
from app.services.pricing import calculate_totals

router = APIRouter(prefix="/api/assistant", tags=["assistant"])
SYSTEM_PROMPT = """你是拾物商城AI购物助手。理解顾客需求，可先追问澄清商品、预算、关键词、数量；信息足够后调用 search_products，按搜索结果中的价格库存推荐分数描述特性评论筛选，每次逐件处理。必须得到用户明确授权购买后才调用 add_to_cart，再 create_order。只有用户清晰说‘直接帮我买’、‘直接下单并付款’等明确支付授权，才调用 pay_order；否则 create_order 后告知 checkout_url。无匹配商品要如实说明。不能编造商品。回复简体中文。"""
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "按需求和关键词搜索商品",
            "parameters": {
                "type": "object",
                "properties": {"keywords": {"type": "string"}},
                "required": ["keywords"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_to_cart",
            "description": "顾客确认购买后加入购物车并锁定库存",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "string"},
                    "quantity": {"type": "integer", "minimum": 1, "maximum": 99},
                },
                "required": ["product_id", "quantity"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_order",
            "description": "按默认地址创建AI优惠订单并生成支付链接",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "pay_order",
            "description": "仅当顾客明确授权直接付款时支付刚创建的订单",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
]


def _address(db: Session, user_id: int) -> Address:
    address = db.scalar(
        select(Address)
        .where(Address.user_id == user_id)
        .order_by(Address.is_default.desc(), Address.id)
    )
    if address is None:
        raise HTTPException(status_code=400, detail="请先添加收货地址，再使用购物助手创建订单")
    return address


def _create_order(db: Session, user: User) -> Order:
    address = _address(db, user.id)
    items = list(
        db.scalars(
            select(CartItem)
            .options(selectinload(CartItem.product))
            .where(CartItem.user_id == user.id, CartItem.selected.is_(True))
        ).all()
    )
    if not items:
        raise HTTPException(status_code=400, detail="购物车中没有待结算商品")
    totals = calculate_totals([(i.product.price, i.quantity) for i in items], "ai")
    order = Order(
        id=secrets.token_hex(16),
        user_id=user.id,
        address_snapshot={
            "recipient": address.recipient,
            "phone": address.phone,
            "region": address.region,
            "detail": address.detail,
        },
        source="ai",
        status=OrderStatus.PENDING_PAYMENT.value,
        subtotal=totals.subtotal,
        discount_amount=totals.discount_amount,
        shipping_amount=totals.shipping_amount,
        payable_amount=totals.payable_amount,
        items=[
            OrderItem(
                product_id=i.product.id,
                product_name=i.product.name,
                image_url=i.product.image_url,
                unit_price=i.product.price,
                quantity=i.quantity,
            )
            for i in items
        ],
    )
    db.add(order)
    for item in items:
        db.delete(item)
    db.flush()
    token = secrets.token_urlsafe(32)
    db.add(
        CheckoutToken(
            token=token,
            order_id=order.id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
    )
    db.commit()
    db.refresh(order)
    return order, token


@router.get("/conversation", response_model=AssistantMessageResponse)
def get_conversation(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    conversation = db.scalar(
        select(AssistantConversation)
        .where(AssistantConversation.user_id == user.id, AssistantConversation.updated_at >= cutoff)
        .order_by(AssistantConversation.updated_at.desc())
    )
    messages = conversation.messages if conversation else []
    return {"reply": "", "messages": messages, "conversation_id": conversation.id if conversation else None}


@router.post("/conversations", response_model=AssistantMessageResponse)
def create_conversation(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conversation = AssistantConversation(user_id=user.id, messages=[])
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return {"reply": "", "messages": [], "conversation_id": conversation.id}


@router.post("/message", response_model=AssistantMessageResponse)
async def chat(
    payload: AssistantMessageRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="AI购物助手尚未配置 OPENAI_API_KEY")
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=24)
    conversation = db.get(AssistantConversation, payload.conversation_id) if payload.conversation_id else None
    if conversation and conversation.user_id != user.id:
        conversation = None
    if conversation is None:
        conversation = db.scalar(
            select(AssistantConversation).where(AssistantConversation.user_id == user.id, AssistantConversation.updated_at >= cutoff).order_by(AssistantConversation.updated_at.desc())
        )
    if conversation is None:
        conversation = AssistantConversation(user_id=user.id, messages=[])
        db.add(conversation)
        db.flush()
    history = list(conversation.messages)
    api_messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *history,
        {"role": "user", "content": payload.message},
    ]
    checkout_url = None
    last_order_id = None

    def execute(name: str, args: dict):
        nonlocal checkout_url, last_order_id
        if name == "search_products":
            term = f"%{args.get('keywords', '')}%"
            from sqlalchemy import or_

            products = db.scalars(
                select(Product)
                .options(selectinload(Product.reviews))
                .where(
                    Product.is_active.is_(True),
                    or_(
                        Product.name.ilike(term),
                        Product.brand.ilike(term),
                        Product.category.ilike(term),
                        Product.description.ilike(term),
                    ),
                )
                .order_by(Product.recommendation_score.desc())
                .limit(30)
            ).all()
            return [
                {
                    "id": p.id,
                    "name": p.name,
                    "brand": p.brand,
                    "category": p.category,
                    "price": p.price,
                    "stock": p.stock,
                    "recommendation_score": p.recommendation_score,
                    "description": p.description,
                    "specs": p.specs,
                    "reviews": [{"rating": r.rating, "content": r.content} for r in p.reviews],
                }
                for p in products
            ]
        if name == "add_to_cart":
            product = db.get(Product, args["product_id"])
            quantity = args.get("quantity", 1)
            if product is None or not product.is_active or product.stock < quantity:
                return {"error": "商品不存在或库存不足"}
            locked_quantity = (
                db.scalar(
                    select(InventoryLock.quantity)
                    .where(InventoryLock.product_id == product.id, InventoryLock.status == "active")
                    .order_by(InventoryLock.expires_at.desc())
                    .limit(1)
                )
                or 0
            )
            if product.stock - locked_quantity < quantity:
                return {"error": "库存不足"}
            item = db.scalar(
                select(CartItem).where(
                    CartItem.user_id == user.id, CartItem.product_id == product.id
                )
            )
            if item is None:
                item = CartItem(
                    user_id=user.id, product_id=product.id, quantity=quantity, selected=True
                )
                db.add(item)
            else:
                item.quantity += quantity
                item.selected = True
            db.add(
                InventoryLock(
                    user_id=user.id,
                    product_id=product.id,
                    quantity=quantity,
                    status="active",
                    expires_at=now + timedelta(minutes=15),
                )
            )
            db.flush()
            return {
                "product_id": product.id,
                "name": product.name,
                "quantity": quantity,
                "locked": True,
            }
        if name == "create_order":
            order, token = _create_order(db, user)
            last_order_id = order.id
            configured_base = os.getenv("FRONTEND_BASE_URL")
            if configured_base:
                base = configured_base.rstrip("/")
            else:
                # Keep links usable outside local development when the frontend
                # and API are served from the same origin.
                forwarded_proto = request.headers.get("x-forwarded-proto")
                forwarded_host = request.headers.get("x-forwarded-host")
                if forwarded_host:
                    scheme = (forwarded_proto or request.url.scheme).split(",")[0].strip()
                    base = f"{scheme}://{forwarded_host.split(',')[0].strip()}"
                else:
                    base = f"{request.url.scheme}://{request.url.netloc}"
            checkout_url = f"{base}/checkout-link/{token}"
            return {
                "order_id": order.id,
                "payable_amount": order.payable_amount,
                "checkout_url": checkout_url,
            }
        if name == "pay_order":
            if last_order_id is None:
                return {"error": "请先创建订单"}
            order = db.get(Order, last_order_id)
            if order is None or order.status != OrderStatus.PENDING_PAYMENT.value:
                return {"error": "订单不可支付"}
            order.status = OrderStatus.PAID_PENDING_SHIPMENT.value
            db.commit()
            configured_base = os.getenv("FRONTEND_BASE_URL")
            if configured_base:
                base = configured_base.rstrip("/")
            else:
                forwarded_proto = request.headers.get("x-forwarded-proto")
                forwarded_host = request.headers.get("x-forwarded-host")
                if forwarded_host:
                    scheme = (forwarded_proto or request.url.scheme).split(",")[0].strip()
                    base = f"{scheme}://{forwarded_host.split(',')[0].strip()}"
                else:
                    base = f"{request.url.scheme}://{request.url.netloc}"
            checkout_url = f"{base}/orders/{order.id}"
            return {
                "order_id": order.id,
                "status": order.status,
                "payable_amount": order.payable_amount,
            }
        return {"error": "unknown tool"}

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            for _ in range(8):
                response = await client.post(
                    os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
                    + "/chat/completions",
                    headers={"Authorization": f"Bearer {key}"},
                    json={
                        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                        "messages": api_messages,
                        "tools": TOOLS,
                        "tool_choice": "auto",
                    },
                )
                response.raise_for_status()
                message = response.json()["choices"][0]["message"]
                api_messages.append(message)
                if not message.get("tool_calls"):
                    reply = message.get("content") or "有什么可以帮助您？"
                    break
                for call in message["tool_calls"]:
                    name = call["function"]["name"]
                    result = execute(name, json.loads(call["function"].get("arguments") or "{}"))
                    api_messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": call["id"],
                            "content": json.dumps(result, ensure_ascii=False),
                        }
                    )
            else:
                raise HTTPException(status_code=502, detail="AI工具调用次数超限")
    except HTTPException:
        db.rollback()
        raise
    except httpx.HTTPError as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail="AI服务暂时不可用，请稍后重试") from exc
    except (KeyError, ValueError, IndexError) as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail="AI服务返回了无法处理的结果") from exc
    history.extend(
        [{"role": "user", "content": payload.message}, {"role": "assistant", "content": reply}]
    )
    conversation.messages = history[-40:]
    conversation.updated_at = now
    db.commit()
    return AssistantMessageResponse(
        reply=reply, messages=conversation.messages, checkout_url=checkout_url, conversation_id=conversation.id
    )


@router.get("/checkout/{token}", response_model=OrderResponse)
def checkout_order(token: str, db: Session = Depends(get_db)):
    checkout = db.get(CheckoutToken, token)
    expires_at = checkout.expires_at if checkout and checkout.expires_at.tzinfo else None
    if checkout is None or (
        expires_at or checkout.expires_at.replace(tzinfo=timezone.utc)
    ) <= datetime.now(timezone.utc):
        raise HTTPException(status_code=404, detail="支付链接已失效")
    order = db.scalar(
        select(Order).options(selectinload(Order.items)).where(Order.id == checkout.order_id)
    )
    if order is None:
        raise HTTPException(status_code=404, detail="订单不存在")
    return order


@router.post("/checkout/{token}/pay", response_model=OrderResponse)
def pay_checkout(token: str, db: Session = Depends(get_db)):
    checkout = db.get(CheckoutToken, token)
    expires_at = checkout.expires_at if checkout and checkout.expires_at.tzinfo else None
    if checkout is None or (
        expires_at or checkout.expires_at.replace(tzinfo=timezone.utc)
    ) <= datetime.now(timezone.utc):
        raise HTTPException(status_code=404, detail="支付链接已失效")
    order = db.scalar(
        select(Order).options(selectinload(Order.items)).where(Order.id == checkout.order_id)
    )
    if order is None:
        raise HTTPException(status_code=404, detail="订单不存在")
    if order.status != OrderStatus.PENDING_PAYMENT.value:
        raise HTTPException(status_code=409, detail="当前订单不可支付")
    order.status = OrderStatus.PAID_PENDING_SHIPMENT.value
    db.commit()
    return order
