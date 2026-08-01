from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.scan import Scan, ScanStatusEnum
from app.repositories.base_repository import BaseRepository


class ScanRepository(BaseRepository[Scan]):
    def __init__(self, session: AsyncSession):
        super().__init__(Scan, session)

    async def create_scan(
        self,
        user_id: int,
        target_domain: str,
        scan_type: str = "Quick Scan",
    ) -> Scan:
        now = datetime.now(timezone.utc)
        scan = Scan(
            user_id=user_id,
            target_domain=target_domain,
            scan_type=scan_type,
            status=ScanStatusEnum.PENDING,
            progress=0,
            started_at=None,
            completed_at=None,
            duration=0.0,
            summary="Defensive assessment pending initialization.",
            created_at=now,
            updated_at=now,
        )
        scan.module_results = {}
        return await self.create(scan)

    async def get_user_scans(self, user_id: int, skip: int = 0, limit: int = 50) -> List[Scan]:
        result = await self.session.execute(
            select(Scan).where(Scan.user_id == user_id).order_by(Scan.id.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def get_scan_by_id(self, scan_id: int) -> Optional[Scan]:
        return await super().get(scan_id)

    async def update_scan_progress(
        self,
        scan_id: int,
        status: ScanStatusEnum,
        progress: int,
        started_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
        duration: Optional[float] = None,
        summary: Optional[str] = None,
    ) -> Optional[Scan]:
        scan = await self.get_scan_by_id(scan_id)
        if not scan:
            return None

        scan.status = status
        scan.progress = progress
        if started_at:
            scan.started_at = started_at
        if completed_at:
            scan.completed_at = completed_at
        if duration is not None:
            scan.duration = duration
        if summary is not None:
            scan.summary = summary
        scan.updated_at = datetime.now(timezone.utc)

        return await self.update(scan)

    async def update_module_results(
        self,
        scan_id: int,
        module_id: str,
        result: Dict[str, Any],
    ) -> Optional[Scan]:
        """
        Merge *result* into Scan.module_results under the key *module_id*.
        Persists into PostgreSQL database.
        """
        scan = await self.get_scan_by_id(scan_id)
        if not scan:
            return None

        existing = scan.module_results
        existing[module_id] = result
        scan.module_results = existing
        scan.updated_at = datetime.now(timezone.utc)

        return await self.update(scan)

    async def delete_scan(self, scan_id: int) -> bool:
        scan = await super().get(scan_id)
        if scan:
            await self.delete(scan)
            return True
        return False
