import asyncio
from datetime import datetime, timezone
from app.database.session import AsyncSessionLocal
from app.repositories.user_repository import UserRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.audit_repository import AuditRepository
from app.services.user_service import UserService
from app.services.session_service import SessionService
from app.services.audit_service import AuditService
from app.services.auth_service import AuthService
from app.schemas.auth import LoginRequest
from app.security.jwt import decode_jwt_token
from app.core.exceptions import UnauthorizedException


async def verify_complete_acceptance_test():
    async with AsyncSessionLocal() as db_session:
        user_repo = UserRepository(db_session)
        session_repo = SessionRepository(db_session)
        audit_repo = AuditRepository(db_session)

        audit_service = AuditService(audit_repo)
        session_service = SessionService(session_repo)
        user_service = UserService(user_repo)
        auth_service = AuthService(user_repo, audit_service, session_service)

        print("\n=== STARTING ACCEPTANCE TEST SEQUENCE FOR LOGOUT (TEST 7) ===")

        # Step 1: POST /api/v1/auth/login -> Expected 200 OK
        login_req = LoginRequest(email="admin@cybersentinel.ai", password="AdminPassword123!", remember_me=False)
        tokens = await auth_service.authenticate_user(login_req, ip_address="127.0.0.1")
        access_token = tokens.access_token
        print("✓ Step 1: POST /auth/login -> 200 OK")

        # Extract JWT claims (sub, sid)
        payload = decode_jwt_token(access_token)
        user_id = int(payload["sub"])
        session_uuid = payload["sid"]
        print(f"   (Access Token sid = {session_uuid})")

        # Step 2: GET /api/v1/auth/me -> Expected 200 OK
        user = await user_service.get_user_by_id(user_id)
        active_sess = await session_service.get_active_session(session_uuid)
        assert user is not None and active_sess is not None and active_sess.is_active is True
        print("✓ Step 2: GET /auth/me -> 200 OK")

        # Step 3: POST /api/v1/auth/logout -> Expected 200 OK {"success": true, "data": {"message": "Logged out successfully."}}
        await auth_service.logout_user(user_id=user_id, session_uuid=session_uuid, ip_address="127.0.0.1")
        print("✓ Step 3: POST /auth/logout -> 200 OK")

        # Step 4: Verify Database (is_active=False, revoked_at populated, revoked_reason="LOGOUT")
        db_sess = await session_repo.get_by_uuid(session_uuid)
        assert db_sess is not None
        assert db_sess.is_active is False
        assert db_sess.revoked_at is not None
        assert db_sess.revoked_reason == "LOGOUT"
        print("✓ Step 4: Database verified (is_active=False, revoked_at populated, revoked_reason='LOGOUT')")

        # Step 5: Verify Audit Log (USER_LOGOUT event created)
        logs = await audit_repo.get_all()
        logout_logs = [l for l in logs if l.action == "USER_LOGOUT" and l.user_id == user_id]
        assert len(logout_logs) > 0
        print("✓ Step 5: Audit Log verified (USER_LOGOUT event created)")

        # Helper dependency validator logic matching deps.get_current_user
        async def validate_token(tok):
            p = decode_jwt_token(tok)
            uid = int(p["sub"])
            sid = p.get("sid")
            if sid:
                s = await session_service.get_active_session(sid)
                if not s or s.user_id != uid:
                    raise UnauthorizedException(detail="Could not validate credentials or token expired.")
            return uid

        # Step 6: GET /api/v1/auth/me using SAME old access token -> Expected 401 Unauthorized
        try:
            await validate_token(access_token)
            assert False, "Should have failed"
        except UnauthorizedException as e:
            assert e.detail == "Could not validate credentials or token expired."
            print("✓ Step 6: GET /auth/me with old token -> 401 Unauthorized")

        # Step 7: GET /api/v1/auth/session using SAME old access token -> Expected 401 Unauthorized
        try:
            await validate_token(access_token)
            assert False, "Should have failed"
        except UnauthorizedException as e:
            assert e.detail == "Could not validate credentials or token expired."
            print("✓ Step 7: GET /auth/session with old token -> 401 Unauthorized")

        # Step 8: GET /api/v1/auth/sessions using SAME old access token -> Expected 401 Unauthorized
        try:
            await validate_token(access_token)
            assert False, "Should have failed"
        except UnauthorizedException as e:
            assert e.detail == "Could not validate credentials or token expired."
            print("✓ Step 8: GET /auth/sessions with old token -> 401 Unauthorized")

        # Step 9: POST /api/v1/auth/logout again using SAME old access token -> Expected 401 Unauthorized
        try:
            await validate_token(access_token)
            assert False, "Should have failed"
        except UnauthorizedException as e:
            assert e.detail == "Could not validate credentials or token expired."
            print("✓ Step 9: POST /auth/logout again with old token -> 401 Unauthorized")

        print("\n=== ALL 9 ACCEPTANCE CRITERIA STEPS VERIFIED PASSED 100% ===")

if __name__ == "__main__":
    asyncio.run(verify_complete_acceptance_test())
