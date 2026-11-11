from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class OrderStatus(StrEnum):
    PENDING_PAYMENT = "pending_payment"
    PAID_PENDING_SHIPMENT = "paid_pending_shipment"
    SHIPPED = "shipped"
    RECEIVED = "received"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    RETURNING = "returning"
    RETURNED = "returned"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    login_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80))
    session_token: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True)


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_products_price_nonnegative"),
        CheckConstraint("stock >= 0", name="ck_products_stock_nonnegative"),
        CheckConstraint(
            "recommendation_score >= 0 AND recommendation_score <= 100",
            name="ck_products_score_range",
        ),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    brand: Mapped[str] = mapped_column(String(100), index=True)
    category: Mapped[str] = mapped_column(String(100), index=True)
    price: Mapped[int] = mapped_column(Integer)
    stock: Mapped[int] = mapped_column(Integer)
    margin_rate: Mapped[float] = mapped_column(Float)
    recommendation_score: Mapped[int] = mapped_column(Integer, index=True)
    description: Mapped[str] = mapped_column(Text)
    specs: Mapped[dict[str, str]] = mapped_column(JSON, default=dict)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    reviews: Mapped[list["Review"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[str] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    user_display_name: Mapped[str] = mapped_column(String(80))
    rating: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    product: Mapped[Product] = relationship(back_populates="reviews")


class Address(Base):
    __tablename__ = "addresses"
    __table_args__ = (Index("ix_addresses_user_default", "user_id", "is_default"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    recipient: Mapped[str] = mapped_column(String(80))
    phone: Mapped[str] = mapped_column(String(30))
    region: Mapped[str] = mapped_column(String(200))
    detail: Mapped[str] = mapped_column(String(500))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_cart_user_product"),
        CheckConstraint("quantity > 0", name="ck_cart_quantity_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    selected: Mapped[bool] = mapped_column(Boolean, default=True)
    product: Mapped[Product] = relationship()


class InventoryLock(Base):
    __tablename__ = "inventory_locks"
    __table_args__ = (CheckConstraint("quantity > 0", name="ck_inventory_lock_quantity_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="active")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(
            "subtotal >= 0 AND discount_amount >= 0 AND shipping_amount >= 0 AND payable_amount >= 0",
            name="ck_orders_amounts_nonnegative",
        ),
        Index("ix_orders_user_created", "user_id", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    address_snapshot: Mapped[dict[str, str]] = mapped_column(JSON)
    source: Mapped[str] = mapped_column(String(20), default="normal")
    status: Mapped[str] = mapped_column(
        String(40), default=OrderStatus.PENDING_PAYMENT.value, index=True
    )
    subtotal: Mapped[int] = mapped_column(Integer)
    discount_amount: Mapped[int] = mapped_column(Integer)
    shipping_amount: Mapped[int] = mapped_column(Integer)
    payable_amount: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("unit_price >= 0 AND quantity > 0", name="ck_order_items_values"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[str] = mapped_column(String(32))
    product_name: Mapped[str] = mapped_column(String(200))
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    unit_price: Mapped[int] = mapped_column(Integer)
    quantity: Mapped[int] = mapped_column(Integer)
    order: Mapped[Order] = relationship(back_populates="items")


class AssistantConversation(Base):
    __tablename__ = "assistant_conversations"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    messages: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, index=True
    )


class CheckoutToken(Base):
    __tablename__ = "checkout_tokens"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
