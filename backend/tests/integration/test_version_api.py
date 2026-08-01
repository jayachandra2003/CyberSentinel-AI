import pytest


@pytest.mark.asyncio
async def test_version_endpoint(async_client):
    response = await async_client.get("/api/v1/version")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert json_data["data"]["version"] == "1.0.0"
