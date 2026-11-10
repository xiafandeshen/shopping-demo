import httpx
import pytest

from app.main import create_app
from scripts.init_data import ROWS
from app.models import Product, Review, User
from datetime import datetime, timezone


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    app = create_app("sqlite:///:memory:")
    async with app.router.lifespan_context(app):
        with app.state.session_factory.begin() as db:
            row = ROWS[0]
            db.add(User(login_id="demo", display_name="示例用户"))
            db.add(
                Product(
                    id=row[0],
                    name=row[1],
                    brand=row[2],
                    category=row[3],
                    price=row[4],
                    stock=row[5],
                    margin_rate=row[6],
                    recommendation_score=row[7],
                    description=row[8],
                    specs=row[9],
                    reviews=[
                        Review(
                            user_display_name=user,
                            rating=rating,
                            content=content,
                            created_at=datetime.fromisoformat(f"2026-{day}").replace(
                                tzinfo=timezone.utc
                            ),
                        )
                        for user, rating, content, day in row[10]
                    ],
                )
            )
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as test_client:
            yield test_client


@pytest.fixture
async def logged_in_client(client):
    response = await client.post("/api/session/login", json={"login_id": "demo"})
    assert response.status_code == 200
    return client
