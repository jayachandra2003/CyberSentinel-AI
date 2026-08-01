from app.tasks.celery_app import celery_app


@celery_app.task(name="tasks.execute_defensive_scan")
def execute_defensive_scan_task(scan_id: int) -> dict:
    """Async task contract for orchestrating defensive scan execution."""
    return {"scan_id": scan_id, "status": "COMPLETED", "message": "Scan contract executed."}
