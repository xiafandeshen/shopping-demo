from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.models import Base, CartItem, Product, User
from app.routers.assistant import _create_order


def test_assistant_order_preserves_existing_cart():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        user = User(login_id="buyer", display_name="Buyer")
        product = Product(
            id="test",
            name="Test",
            brand="Test",
            category="Test",
            price=100,
            stock=10,
            margin_rate=0.1,
            recommendation_score=1,
            description="Test",
            specs={},
        )
        db.add_all([user, product])
        db.flush()
        db.add(
            CartItem(user_id=user.id, product_id=product.id, quantity=5, selected=False)
        )
        db.commit()
        order, _ = _create_order(db, user, {product.id: 2})
        assert order.items[0].quantity == 2
        remaining = db.scalar(select(CartItem))
        assert remaining.quantity == 3
        assert remaining.selected is False
