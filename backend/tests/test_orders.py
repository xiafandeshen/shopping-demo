import pytest

from app.services.pricing import calculate_totals


def test_pricing_thresholds_and_ai_discount():
    assert calculate_totals([(999, 1)], "normal").shipping_amount == 0
    assert calculate_totals([(998, 1)], "normal").shipping_amount == 100
    normal = calculate_totals([(1000, 1)], "normal")
    assert normal.discount_amount == 100
    assert normal.payable_amount == 900
    ai = calculate_totals([(1000, 1)], "ai")
    assert ai.discount_amount == 145
    assert ai.payable_amount == 855


@pytest.mark.anyio
async def test_create_order_and_pay(logged_in_client):
    client = logged_in_client
    address = (
        await client.post(
            "/api/addresses",
            json={
                "recipient": "Lin",
                "phone": "12345678",
                "region": "台北",
                "detail": "中山路 1 號",
            },
        )
    ).json()
    await client.post("/api/cart/items", json={"product_id": "P001", "quantity": 1})

    order_response = await client.post("/api/orders", json={"address_id": address["id"]})
    assert order_response.status_code == 201
    order = order_response.json()
    assert order["subtotal"] == 1890
    assert order["payable_amount"] == 1790
    assert order["items"][0]["product_name"] == "Aero 無線藍牙耳機"

    paid = await client.post(f"/api/orders/{order['id']}/pay")
    assert paid.status_code == 200
    assert paid.json()["status"] == "paid_pending_shipment"
    assert (await client.post(f"/api/orders/{order['id']}/pay")).status_code == 409


@pytest.mark.anyio
async def test_list_orders_returns_orm_orders(logged_in_client):
    client = logged_in_client
    address = (
        await client.post(
            "/api/addresses",
            json={
                "recipient": "Lin",
                "phone": "12345678",
                "region": "台北",
                "detail": "中山路 1 號",
            },
        )
    ).json()
    await client.post("/api/cart/items", json={"product_id": "P001", "quantity": 1})
    assert (await client.post("/api/orders", json={"address_id": address["id"]})).status_code == 201

    response = await client.get("/api/orders?page=1")

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["items"][0]["product_name"] == "Aero 無線藍牙耳機"


@pytest.mark.anyio
async def test_order_status_actions(logged_in_client):
    client = logged_in_client
    address = (
        await client.post(
            "/api/addresses",
            json={
                "recipient": "Lin",
                "phone": "12345678",
                "region": "台北",
                "detail": "中山路 1 號",
            },
        )
    ).json()
    await client.post("/api/cart/items", json={"product_id": "P001", "quantity": 1})
    order = (await client.post("/api/orders", json={"address_id": address["id"]})).json()

    cancelled = await client.post(f"/api/orders/{order['id']}/actions", json={"action": "cancel"})
    assert cancelled.json()["status"] == "cancelled"
    assert (
        await client.post(f"/api/orders/{order['id']}/actions", json={"action": "return"})
    ).status_code == 409


@pytest.mark.anyio
async def test_assistant_requires_login(logged_in_client):
    client = logged_in_client
    await client.post("/api/session/logout")
    response = await client.get("/api/assistant/conversation")
    assert response.status_code == 401


@pytest.mark.anyio
async def test_assistant_checkout_token_pays_without_login(logged_in_client):
    from datetime import datetime, timedelta, timezone
    from secrets import token_urlsafe

    from app.models import CheckoutToken

    client = logged_in_client
    address = (
        await client.post(
            "/api/addresses",
            json={
                "recipient": "Lin",
                "phone": "12345678",
                "region": "台北",
                "detail": "中山路 1 號",
            },
        )
    ).json()
    await client.post("/api/cart/items", json={"product_id": "P001", "quantity": 1})
    order = (
        await client.post("/api/orders", json={"address_id": address["id"], "source": "ai"})
    ).json()
    token = token_urlsafe(32)
    app = client._transport.app
    with app.state.session_factory.begin() as db:
        db.add(
            CheckoutToken(
                token=token,
                order_id=order["id"],
                expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            )
        )
    await client.post("/api/session/logout")

    fetched = await client.get(f"/api/assistant/checkout/{token}")
    assert fetched.status_code == 200
    assert fetched.json()["source"] == "ai"
    paid = await client.post(f"/api/assistant/checkout/{token}/pay")
    assert paid.status_code == 200
    assert paid.json()["status"] == "paid_pending_shipment"
