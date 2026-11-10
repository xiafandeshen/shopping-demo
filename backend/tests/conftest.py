import httpx
import pytest

from app.main import create_app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    app = create_app("sqlite:///:memory:")
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as test_client:
            yield test_client


@pytest.fixture
async def logged_in_client(client):
    response = await client.post("/api/session/login", json={"login_id": "demo"})
    assert response.status_code == 200
    return client
