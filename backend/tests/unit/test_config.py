from app.core.config import settings


def test_settings_initialization():
    assert settings.PROJECT_NAME == "CyberSentinel AI API Gateway"
    assert settings.API_V1_STR == "/api/v1"
    assert settings.VERSION == "1.0.0"
