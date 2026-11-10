from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_display_name: str
    rating: int
    content: str
    created_at: datetime


class ProductResponse(BaseModel):
    id: str
    name: str
    brand: str
    category: str
    price: int
    stock: int
    margin_rate: float
    recommendation_score: int
    description: str
    specs: dict[str, str]
    image_url: str | None


class ProductDetailResponse(ProductResponse):
    reviews: list[ReviewResponse]


class ProductPageResponse(BaseModel):
    items: list[ProductResponse]
    page: int
    page_size: int
    total: int


class LoginRequest(BaseModel):
    login_id: str = "demo"


class SessionResponse(BaseModel):
    id: int
    display_name: str


class AddressCreate(BaseModel):
    recipient: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=6, max_length=30)
    region: str = Field(min_length=1, max_length=200)
    detail: str = Field(min_length=1, max_length=500)
    is_default: bool = False


class AddressResponse(AddressCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


class CartAddRequest(BaseModel):
    product_id: str
    quantity: int = Field(ge=1, le=99)


class CartQuantityRequest(BaseModel):
    quantity: int = Field(ge=1, le=99)


class CartSelectionRequest(BaseModel):
    selected: bool


class CartItemResponse(BaseModel):
    id: int
    product_id: str
    product_name: str
    image_url: str | None
    unit_price: int
    quantity: int
    selected: bool
    line_total: int
    stock: int


class CartResponse(BaseModel):
    items: list[CartItemResponse]
    total_quantity: int


class OrderCreateRequest(BaseModel):
    address_id: int
    source: Literal["normal", "ai"] = "normal"


class OrderItemResponse(BaseModel):
    product_id: str
    product_name: str
    image_url: str | None
    unit_price: int
    quantity: int


class OrderResponse(BaseModel):
    id: str
    status: str
    source: str
    address_snapshot: dict[str, str]
    subtotal: int
    discount_amount: int
    shipping_amount: int
    payable_amount: int
    created_at: datetime
    items: list[OrderItemResponse]


class OrderPageResponse(BaseModel):
    items: list[OrderResponse]
    total: int


class OrderActionRequest(BaseModel):
    action: Literal["cancel", "return", "receive", "cancel_return"]
