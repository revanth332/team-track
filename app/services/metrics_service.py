import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional


logger = logging.getLogger(__name__)
IST = timezone(timedelta(hours=5, minutes=30))
METRICS_COLLECTION = "daily_metrics"
METRIC_SHIFTS_CALLS = "shifts_endpoint_calls"
METRIC_ZOHO_TOKEN_CALLS = "zoho_token_endpoint_calls"


def _today_ist(now: Optional[datetime] = None) -> str:
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    return current.astimezone(IST).date().isoformat()


async def increment_daily_metric(
    metric: str,
    *,
    now: Optional[datetime] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    from app.core.database import get_database

    db = get_database()
    collection = getattr(db, METRICS_COLLECTION)
    timestamp = datetime.now(timezone.utc)
    metric_date = _today_ist(now)

    update: Dict[str, Any] = {
        "$inc": {"count": 1},
        "$set": {
            "metric": metric,
            "date": metric_date,
            "timezone": "Asia/Kolkata",
            "updated_at": timestamp,
        },
        "$setOnInsert": {
            "created_at": timestamp,
        },
    }
    if metadata:
        update["$set"].update(metadata)

    await collection.update_one(
        {"metric": metric, "date": metric_date},
        update,
        upsert=True,
    )


async def increment_daily_metric_safe(
    metric: str,
    *,
    now: Optional[datetime] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    try:
        await increment_daily_metric(metric, now=now, metadata=metadata)
    except Exception as exc:
        logger.warning("Failed to record metric %s: %s", metric, exc)
