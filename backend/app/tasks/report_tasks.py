from app.tasks.celery_app import celery_app


@celery_app.task(name="tasks.generate_scan_report")
def generate_scan_report_task(scan_id: int, format: str = "PDF") -> dict:
    """Async task contract for generating security assessment reports."""
    return {"scan_id": scan_id, "format": format, "status": "GENERATED"}
