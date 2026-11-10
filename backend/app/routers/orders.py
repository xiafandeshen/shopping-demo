from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Address, CartItem, Order, OrderItem, OrderStatus, User
from app.schemas import OrderActionRequest, OrderCreateRequest, OrderPageResponse, OrderResponse
from app.services.pricing import calculate_totals

router = APIRouter(prefix="/api/orders", tags=["orders"])

ALLOWED_ACTIONS = {
    OrderStatus.PENDING_PAYMENT.value: {"cancel": OrderStatus.CANCELLED.value},
    OrderStatus.PAID_PENDING_SHIPMENT.value: {"cancel": OrderStatus.CANCELLED.value},
    OrderStatus.SHIPPED.value: {
        "return": OrderStatus.RETURNING.value,
        "receive": OrderStatus.COMPLETED.value,
    },
    OrderStatus.RETURNING.value: {"cancel_return": OrderStatus.SHIPPED.value},
    OrderStatus.RECEIVED.value: {"receive": OrderStatus.COMPLETED.value},
}


def _get_order(db: Session, user_id: int, order_id: str) -> Order:
    order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.user_id == user_id)
    )
    if order is None:
        raise HTTPException(status_code=404, detail="订单不存在")
    return order


@router.post("", response_model=OrderResponse, status_code=201)
def create_order(
    payload: OrderCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Order:
    address = db.scalar(
        select(Address).where(Address.id == payload.address_id, Address.user_id == user.id)
    )
    if address is None:
        raise HTTPException(status_code=404, detail="收货地址不存在")
    cart_items = db.scalars(
        select(CartItem)
        .options(selectinload(CartItem.product))
        .where(CartItem.user_id == user.id, CartItem.selected.is_(True))
    ).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="请先选择要结算的商品")

    totals = calculate_totals(
        [(item.product.price, item.quantity) for item in cart_items], payload.source
    )
    order = Order(
        id=uuid4().hex,
        user_id=user.id,
        address_snapshot={
            "recipient": address.recipient,
            "phone": address.phone,
            "region": address.region,
            "detail": address.detail,
        },
        source=payload.source,
        status=OrderStatus.PENDING_PAYMENT.value,
        subtotal=totals.subtotal,
        discount_amount=totals.discount_amount,
        shipping_amount=totals.shipping_amount,
        payable_amount=totals.payable_amount,
        items=[
            OrderItem(
                product_id=item.product.id,
                product_name=item.product.name,
                image_url=item.product.image_url,
                unit_price=item.product.price,
                quantity=item.quantity,
            )
            for item in cart_items
        ],
    )
    db.add(order)
    for item in cart_items:
        db.delete(item)
    db.commit()
    return _get_order(db, user.id, order.id)


@router.get("", response_model=OrderPageResponse)
def list_orders(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderPageResponse:
    total = db.scalar(select(func.count()).select_from(Order).where(Order.user_id == user.id)) or 0
    orders = db.scalars(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return OrderPageResponse(items=orders, total=total)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Order:
    return _get_order(db, user.id, order_id)


@router.post("/{order_id}/actions", response_model=OrderResponse)
def act_on_order(
    order_id: str,
    payload: OrderActionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Order:
    order = _get_order(db, user.id, order_id)
    new_status = ALLOWED_ACTIONS.get(order.status, {}).get(payload.action)
    if new_status is None:
        raise HTTPException(status_code=409, detail="当前订单状态不支持此操作")
    order.status = new_status
    db.commit()
    return _get_order(db, user.id, order.id)


@router.post("/{order_id}/pay", response_model=OrderResponse)
def pay_order(
    order_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Order:
    order = _get_order(db, user.id, order_id)
    if order.status != OrderStatus.PENDING_PAYMENT.value:
        raise HTTPException(status_code=409, detail="当前订单不可支付")
    order.status = OrderStatus.PAID_PENDING_SHIPMENT.value
    db.commit()
    return _get_order(db, user.id, order.id)
