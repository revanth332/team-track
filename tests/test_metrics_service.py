import unittest
import sys
import types
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

from app.services import metrics_service


class FakeMetricsCollection:
    def __init__(self):
        self.update_one = AsyncMock()


class FakeDatabase:
    def __init__(self):
        self.daily_metrics = FakeMetricsCollection()


class MetricsServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_increment_daily_metric_upserts_count_by_metric_and_ist_date(self):
        db = FakeDatabase()
        now = datetime(2026, 9, 2, 20, 0, 0, tzinfo=timezone.utc)
        fake_database_module = types.SimpleNamespace(get_database=lambda: db)

        with patch.dict(sys.modules, {"app.core.database": fake_database_module}):
            await metrics_service.increment_daily_metric(
                metrics_service.METRIC_SHIFTS_CALLS,
                now=now,
                metadata={"path": "/shifts"},
            )

        db.daily_metrics.update_one.assert_awaited_once()
        query, update = db.daily_metrics.update_one.await_args.args
        kwargs = db.daily_metrics.update_one.await_args.kwargs

        self.assertEqual(
            query,
            {"metric": metrics_service.METRIC_SHIFTS_CALLS, "date": "2026-09-03"},
        )
        self.assertEqual(update["$inc"], {"count": 1})
        self.assertEqual(update["$set"]["path"], "/shifts")
        self.assertEqual(update["$set"]["timezone"], "Asia/Kolkata")
        self.assertTrue(kwargs["upsert"])

    async def test_increment_daily_metric_safe_swallows_metric_failures(self):
        with (
            patch.object(
                metrics_service,
                "increment_daily_metric",
                AsyncMock(side_effect=Exception("mongo unavailable")),
            ),
            patch.object(metrics_service.logger, "warning") as warning,
        ):
            await metrics_service.increment_daily_metric_safe("test_metric")

        warning.assert_called_once()


if __name__ == "__main__":
    unittest.main()
