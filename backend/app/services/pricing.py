from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class OrderTotals:
    subtotal: int
    discount_amount: int
    shipping_amount: int
    payable_amount: int


def calculate_totals(items: list[tuple[int, int]], source: Literal["normal", "ai"]) -> OrderTotals:
    subtotal = sum(unit_price * quantity for unit_price, quantity in items)
    threshold_discount = 100 if subtotal >= 1000 else 0
    after_threshold_discount = subtotal - threshold_discount
    ai_discount = (
        after_threshold_discount - (after_threshold_discount * 95 // 100) if source == "ai" else 0
    )
    shipping_amount = 0 if subtotal >= 999 else 100
    discount_amount = threshold_discount + ai_discount
    return OrderTotals(
        subtotal=subtotal,
        discount_amount=discount_amount,
        shipping_amount=shipping_amount,
        payable_amount=subtotal - discount_amount + shipping_amount,
    )
