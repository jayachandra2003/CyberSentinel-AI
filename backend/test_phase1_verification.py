import asyncio
import sys
from alembic.config import Config
from alembic import command
from sqlalchemy import inspect
from app.database.session import engine
from app.core.config import settings


def run_alembic_upgrade():
    print(f"[1] Loading Settings... PROJECT_NAME='{settings.PROJECT_NAME}'")
    print(f"[2] ACCESS_TOKEN_EXPIRE_MINUTES = {settings.ACCESS_TOKEN_EXPIRE_MINUTES}")
    print(f"[3] REFRESH_TOKEN_EXPIRE_HOURS = {settings.REFRESH_TOKEN_EXPIRE_HOURS}")
    print(f"[4] REMEMBER_DEVICE_DAYS = {settings.REMEMBER_DEVICE_DAYS}")
    
    alembic_cfg = Config("alembic.ini")
    print("[5] Running Alembic Upgrade Head...")
    command.upgrade(alembic_cfg, "head")
    print("[SUCCESS] Alembic migration applied successfully!")


async def verify_tables():
    async with engine.connect() as conn:
        def check_table(sync_conn):
            inspector = inspect(sync_conn)
            tables = inspector.get_table_names()
            print(f"[6] Existing Tables in PostgreSQL ({len(tables)}): {tables}")
            assert "user_sessions" in tables, "'user_sessions' table missing!"
            columns = [col["name"] for col in inspector.get_columns("user_sessions")]
            print(f"[7] 'user_sessions' Columns ({len(columns)}): {columns}")
            assert "session_uuid" in columns
            assert "refresh_token_hash" in columns
            assert "country" in columns
            assert "browser_name" in columns
            print("[SUCCESS] 'user_sessions' schema verified!")

        await conn.run_sync(check_table)


if __name__ == "__main__":
    try:
        run_alembic_upgrade()
        asyncio.run(verify_tables())
        print("\n=== PHASE 1 VERIFICATION 100% SUCCESSFUL ===")
    except Exception as e:
        print(f"[ERROR] Verification failed: {e}")
        sys.exit(1)
