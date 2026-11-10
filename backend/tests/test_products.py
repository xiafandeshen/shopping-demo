import pytest


@pytest.mark.anyio
async def test_recommended_products_include_seed_product(client):
    response = await client.get("/api/products/recommended")

    assert response.status_code == 200
    assert response.json()[0]["id"] == "P001"
    assert response.json()[0]["recommendation_score"] == 82


@pytest.mark.anyio
async def test_search_returns_product_specs_and_reviews(client):
    response = await client.get("/api/products/P001")

    assert response.status_code == 200
    assert response.json()["specs"]["連線"] == "藍牙 5.3"
    assert len(response.json()["reviews"]) == 3


@pytest.mark.anyio
async def test_search_has_empty_state_for_unknown_term(client):
    response = await client.get("/api/products", params={"q": "no such product"})

    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert response.json()["items"] == []


@pytest.mark.anyio
async def test_unknown_product_returns_404(client):
    assert (await client.get("/api/products/missing")).status_code == 404
