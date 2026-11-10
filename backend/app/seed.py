from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Product, Review, User


def seed_database(session: Session) -> None:
    demo_user = session.scalar(select(User).where(User.login_id == "demo"))
    if demo_user is None:
        session.add(User(login_id="demo", display_name="示例用户"))

    product = session.get(Product, "P001")
    if product is None:
        product = Product(
            id="P001",
            name="Aero 無線藍牙耳機",
            brand="Pulso",
            category="3C 配件",
            price=1890,
            stock=35,
            margin_rate=0.42,
            recommendation_score=82,
            description="輕巧入耳式設計，通勤、運動都適用。支援快充，充電 10 分鐘可聽 1 小時。",
            specs={
                "連線": "藍牙 5.3",
                "續航": "單次 6 小時，含充電盒 24 小時",
                "防水等級": "IPX4",
                "重量": "單耳 4.8g",
            },
        )
        session.add(product)
        session.flush()

    existing_reviews = session.scalars(select(Review).where(Review.product_id == "P001")).all()
    if not existing_reviews:
        reviews = [
            ("陳**", 5, "配對很快，戴著跑步不會掉。", date(2026, 9, 2)),
            ("Kevin", 4, "音質不錯，但通話時對方說聲音有點小。", date(2026, 9, 18)),
            ("小雨", 5, "第二副了，買給家人用。", date(2026, 10, 5)),
        ]
        session.add_all(
            Review(
                product_id="P001",
                user_display_name=user_name,
                rating=rating,
                content=content,
                created_at=datetime.combine(review_date, datetime.min.time(), tzinfo=timezone.utc),
            )
            for user_name, rating, content, review_date in reviews
        )

    session.commit()
