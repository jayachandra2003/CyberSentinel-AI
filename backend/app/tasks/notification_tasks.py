from app.tasks.celery_app import celery_app


@celery_app.task(name="tasks.send_alert_notification")
def send_alert_notification_task(user_id: int, title: str, message: str) -> dict:
    """Async task contract for sending alert notifications."""
    return {"user_id": user_id, "delivered": True}
