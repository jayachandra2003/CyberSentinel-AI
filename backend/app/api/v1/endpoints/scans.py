import asyncio
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.database.session import AsyncSessionLocal, get_db
from app.models.user import User
from app.repositories.scan_repository import ScanRepository
from app.schemas.common import ApiResponse
from app.schemas.scan import ScanCreate, ScanResponse
from app.scanner.orchestrator.scan_orchestrator import ScanOrchestrator

router = APIRouter()
orchestrator = ScanOrchestrator()


async def _run_pipeline_with_own_session(scan_id: int) -> None:
    """
    Run the scan pipeline in a background task with its own independent DB session.

    The request-scoped session is closed by FastAPI's dependency teardown before
    the background task begins executing, so passing the request's scan_repo would
    cause 'Session is already closed' / InvalidStateError exceptions.

    Instead, we open a fresh AsyncSession here, scoped entirely to this task.
    """
    async with AsyncSessionLocal() as session:
        scan_repo = ScanRepository(session)
        try:
            await orchestrator.execute_scan_pipeline(scan_id, scan_repo)
        except Exception:
            # Pipeline errors are internal — never crash the background task silently
            pass


@router.post("/", response_model=ApiResponse[ScanResponse], status_code=status.HTTP_201_CREATED)
async def create_scan(
    payload: ScanCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new defensive scan and trigger background execution."""
    scan_repo = ScanRepository(db)
    scan = await scan_repo.create_scan(
        user_id=current_user.id,
        target_domain=payload.target_domain,
        scan_type=payload.scan_type,
    )

    # Launch background pipeline with its OWN session — never reuse the request session.
    asyncio.create_task(_run_pipeline_with_own_session(scan.id))

    return ApiResponse(
        success=True,
        data=ScanResponse.model_validate(scan),
    )


@router.get("/", response_model=ApiResponse[List[ScanResponse]])
async def list_scans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all scans for the current authenticated user."""
    scan_repo = ScanRepository(db)
    scans = await scan_repo.get_user_scans(user_id=current_user.id)
    return ApiResponse(
        success=True,
        data=[ScanResponse.model_validate(s) for s in scans],
    )


@router.get("/{scan_id}", response_model=ApiResponse[ScanResponse])
async def get_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve scan status and details by ID."""
    scan_repo = ScanRepository(db)
    scan = await scan_repo.get_scan_by_id(scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan record not found.",
        )
    return ApiResponse(
        success=True,
        data=ScanResponse.model_validate(scan),
    )


@router.delete("/{scan_id}", response_model=ApiResponse[dict])
async def delete_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete or cancel a scan record by ID."""
    scan_repo = ScanRepository(db)
    scan = await scan_repo.get_scan_by_id(scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan record not found.",
        )
    await scan_repo.delete_scan(scan_id)
    return ApiResponse(
        success=True,
        data={"message": f"Scan {scan_id} deleted successfully."},
    )
