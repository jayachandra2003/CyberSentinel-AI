import pytest
from app.security.jwt import create_access_token, create_refresh_token, decode_jwt_token
from app.core.security import get_password_hash, verify_password


def test_password_hashing_and_verification():
    raw_password = "SecurePassword123!"
    hashed = get_password_hash(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_generation_and_decoding():
    user_id = 42
    access_token = create_access_token(subject=user_id)
    payload = decode_jwt_token(access_token)

    assert payload.get("sub") == str(user_id)
    assert payload.get("type") == "access"


def test_refresh_token_generation():
    user_id = 42
    refresh_token = create_refresh_token(subject=user_id)
    payload = decode_jwt_token(refresh_token)

    assert payload.get("sub") == str(user_id)
    assert payload.get("type") == "refresh"
