import pytest


@pytest.mark.asyncio
async def test_root_and_v1_router(async_client):
    res_root = await async_client.get("/")
    assert res_root.status_code == 200
    assert res_root.json()["data"]["name"] == "CyberSentinel AI API Gateway"
