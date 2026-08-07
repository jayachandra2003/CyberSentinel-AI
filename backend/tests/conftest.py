import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.engine_service import engine_service


@pytest.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.fixture(autouse=True)
async def cleanup_engine_service():
    """Ensure engine_service background workers are cleanly stopped after each test."""
    yield
    if engine_service.worker_pool.is_running():
        await engine_service.shutdown()
