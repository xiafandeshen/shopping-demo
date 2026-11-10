import pytest


@pytest.mark.anyio
async def test_demo_login_me_and_logout(client):
    login_response = await client.post("/api/session/login", json={"login_id": "demo"})
    assert login_response.status_code == 200
    assert login_response.json()["display_name"] == "示例用户"

    assert (await client.get("/api/session/me")).status_code == 200
    assert (await client.post("/api/session/logout")).status_code == 204
    assert (await client.get("/api/session/me")).status_code == 401


@pytest.mark.anyio
async def test_protected_cart_requires_login(client):
    assert (await client.get("/api/cart")).status_code == 401
