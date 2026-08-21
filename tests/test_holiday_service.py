import unittest
from unittest.mock import patch, AsyncMock
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from app.schemas.holiday import HolidayCreate, HolidayUpdate
from app.services import holiday_service
from app.services.bandwidth_email_service import check_weekend_or_holiday, IST


class FakeHolidaysCollection:
    def __init__(self, holidays):
        self.holidays = holidays

    async def find_one(self, query):
        for h in self.holidays:
            if all(h.get(k) == v for k, v in query.items()):
                return h
        return None

    async def insert_one(self, doc):
        new_doc = dict(doc)
        new_doc["_id"] = ObjectId()
        self.holidays.append(new_doc)
        class InsertResult:
            inserted_id = new_doc["_id"]
        return InsertResult()


class FakeDatabase:
    def __init__(self, holidays):
        self.holidays = FakeHolidaysCollection(holidays)


class HolidayAndWeekendCronTests(unittest.IsolatedAsyncioTestCase):
    async def test_weekend_detection_saturday(self):
        # 2026-08-22 is Saturday
        sat_dt = datetime(2026, 8, 22, 12, 0, 0, tzinfo=timezone.utc)
        db = FakeDatabase([])
        with patch("app.services.bandwidth_email_service.get_database", return_value=db):
            is_blocked, reason = await check_weekend_or_holiday(sat_dt)
            self.assertTrue(is_blocked)
            self.assertIn("Weekend", reason)
            self.assertIn("Saturday", reason)

    async def test_weekend_detection_sunday(self):
        # 2026-08-23 is Sunday
        sun_dt = datetime(2026, 8, 23, 12, 0, 0, tzinfo=timezone.utc)
        db = FakeDatabase([])
        with patch("app.services.bandwidth_email_service.get_database", return_value=db):
            is_blocked, reason = await check_weekend_or_holiday(sun_dt)
            self.assertTrue(is_blocked)
            self.assertIn("Weekend", reason)
            self.assertIn("Sunday", reason)

    async def test_holiday_detection_weekday(self):
        # 2026-08-21 is Friday (weekday)
        fri_dt = datetime(2026, 8, 21, 11, 30, 0, tzinfo=timezone.utc) # 5:00 PM IST
        holiday_item = {
            "_id": ObjectId(),
            "name": "Independence Day Celebration",
            "date": "2026-08-21",
            "description": "Company holiday"
        }
        db = FakeDatabase([holiday_item])
        with patch("app.services.bandwidth_email_service.get_database", return_value=db):
            is_blocked, reason = await check_weekend_or_holiday(fri_dt)
            self.assertTrue(is_blocked)
            self.assertIn("Holiday", reason)
            self.assertIn("Independence Day Celebration", reason)

    async def test_normal_working_day(self):
        # 2026-08-21 is Friday (no holiday in DB)
        fri_dt = datetime(2026, 8, 21, 11, 30, 0, tzinfo=timezone.utc)
        db = FakeDatabase([])
        with patch("app.services.bandwidth_email_service.get_database", return_value=db):
            is_blocked, reason = await check_weekend_or_holiday(fri_dt)
            self.assertFalse(is_blocked)
            self.assertEqual(reason, "")


if __name__ == "__main__":
    unittest.main()
