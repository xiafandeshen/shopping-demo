import pytest


@pytest.mark.anyio
async def test_add_cart_item_records_inventory_lock(logged_in_client):
    response = await logged_in_client.post(
        "/api/cart/items",
        json={"product_id": "P001", "quantity": 2},
    )

    assert response.status_code == 201
    assert response.json()["quantity"] == 2
    assert response.json()["line_total"] == 3780


@pytest.mark.anyio
async def test_cart_selection_quantity_and_removal(logged_in_client):
    client = logged_in_client
    item = (await client.post("/api/cart/items", json={"product_id": "P001", "quantity": 1})).json()
    item_id = item["id"]

    updated = await client.patch(f"/api/cart/items/{item_id}", json={"quantity": 3})
    assert updated.json()["quantity"] == 3

    unselected = await client.patch(
        f"/api/cart/items/{item_id}/selection",
        json={"selected": False},
    )
    assert unselected.json()["selected"] is False

    assert (await client.delete(f"/api/cart/items/{item_id}")).status_code == 204
    assert (await client.get("/api/cart")).json()["items"] == []


@pytest.mark.anyio
async def test_cart_rejects_unknown_product(logged_in_client):
    response = await logged_in_client.post(
        "/api/cart/items",
        json={"product_id": "missing", "quantity": 1},
    )

    assert response.status_code == 404
