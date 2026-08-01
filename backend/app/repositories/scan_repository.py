from datetime import datetime, timezone
from typing import List, Optional, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.scan import Scan, ScanStatusEnum
from app.repositories.base_repository import BaseRepository

_in_memory_scans: Dict[int, Scan] = {}
_scan_id_counter = 1


class ScanRepository(BaseRepository[Scan]):
    def __init__(self, session: AsyncSession):
        super().__init__(Scan, session)

    async def create_scan(
        self,
        user_id: int,
        target_domain: str,
        scan_type: str = "Quick Scan",
    ) -> Scan:
        global _scan_id_counter
        now = datetime.now(timezone.utc)
        scan = Scan(
            id=_scan_id_counter,
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
        _scan_id_counter += 1
        _in_memory_scans[scan.id] = scan

        try:
            return await self.create(scan)
        except Exception:
            return scan

    async def get_user_scans(self, user_id: int, skip: int = 0, limit: int = 50) -> List[Scan]:
        try:
            result = await self.session.execute(
                select(Scan).where(Scan.user_id == user_id).order_by(Scan.id.desc()).offset(skip).limit(limit)
            )
            scans = list(result.scalars().all())
            if scans:
                return scans
        except Exception:
            pass

        user_scans = [s for s in _in_memory_scans.values() if s.user_id == user_id]
        user_scans.sort(key=lambda x: x.id, reverse=True)
        return user_scans[skip : skip + limit]

    async def get_scan_by_id(self, scan_id: int) -> Optional[Scan]:
        try:
            db_scan = await super().get(scan_id)
            if db_scan:
                return db_scan
        except Exception:
            pass
        return _in_memory_scans.get(scan_id)

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

        try:
            await self.update(scan)
        except Exception:
            pass

        _in_memory_scans[scan_id] = scan
        return scan

    async def delete_scan(self, scan_id: int) -> bool:
        if scan_id in _in_memory_scans:
            del _in_memory_scans[scan_id]

        try:
            scan = await super().get(scan_id)
            if scan:
                await self.delete(scan_id)
                return True
        except Exception:
            pass
        return True
