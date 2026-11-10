from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import CartItem, InventoryLock, Product, User
from app.schemas import (
    CartAddRequest,
    CartItemResponse,
    CartQuantityRequest,
    CartResponse,
    CartSelectionRequest,
)

router = APIRouter(prefix="/api/cart", tags=["cart"])


def _cart_item_response(item: CartItem) -> CartItemResponse:
    return CartItemResponse(
        id=item.id,
        product_id=item.product.id,
        product_name=item.product.name,
        image_url=item.product.image_url,
        unit_price=item.product.price,
        quantity=item.quantity,
        selected=item.selected,
        line_total=item.product.price * item.quantity,
        stock=item.product.stock,
    )


def _get_item(db: Session, user_id: int, item_id: int) -> CartItem:
    item = db.scalar(
        select(CartItem)
        .options(joinedload(CartItem.product))
        .where(CartItem.id == item_id, CartItem.user_id == user_id)
    )
    if item is None:
        raise HTTPException(status_code=404, detail="购物车商品不存在")
    return item


def _record_lock(db: Session, user_id: int, product_id: str, quantity: int) -> None:
    db.add(
        InventoryLock(
            user_id=user_id,
            product_id=product_id,
            quantity=quantity,
            status="active",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        )
    )


@router.get("", response_model=CartResponse)
def get_cart(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CartResponse:
    items = db.scalars(
        select(CartItem).options(joinedload(CartItem.product)).where(CartItem.user_id == user.id)
    ).all()
    return CartResponse(
        items=[_cart_item_response(item) for item in items],
        total_quantity=sum(item.quantity for item in items),
    )


@router.post("/items", response_model=CartItemResponse, status_code=201)
def add_cart_item(
    payload: CartAddRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartItemResponse:
    product = db.get(Product, payload.product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=404, detail="商品不存在")
    item = db.scalar(
        select(CartItem).where(CartItem.user_id == user.id, CartItem.product_id == product.id)
    )
    if item is None:
        item = CartItem(
            user_id=user.id, product_id=product.id, quantity=payload.quantity, selected=True
        )
        db.add(item)
        db.flush()
    else:
        item.quantity += payload.quantity
    _record_lock(db, user.id, product.id, payload.quantity)
    db.commit()
    item = _get_item(db, user.id, item.id)
    return _cart_item_response(item)


@router.patch("/items/{item_id}", response_model=CartItemResponse)
def update_cart_item(
    item_id: int,
    payload: CartQuantityRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartItemResponse:
    item = _get_item(db, user.id, item_id)
    delta = payload.quantity - item.quantity
    if delta > 0:
        _record_lock(db, user.id, item.product_id, delta)
    item.quantity = payload.quantity
    db.commit()
    return _cart_item_response(_get_item(db, user.id, item.id))


@router.patch("/items/{item_id}/selection", response_model=CartItemResponse)
def update_cart_selection(
    item_id: int,
    payload: CartSelectionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartItemResponse:
    item = _get_item(db, user.id, item_id)
    item.selected = payload.selected
    db.commit()
    return _cart_item_response(_get_item(db, user.id, item.id))


@router.delete("/items/{item_id}", status_code=204)
def remove_cart_item(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    item = _get_item(db, user.id, item_id)
    db.delete(item)
    db.commit()
