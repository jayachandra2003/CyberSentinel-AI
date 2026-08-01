import pytest


@pytest.fixture
def mock_user_payload():
    return {
        "email": "analyst@cybersentinel.ai",
        "full_name": "Senior Security Analyst",
        "role": "ANALYST",
    }
