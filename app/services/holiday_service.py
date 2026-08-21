from bson import ObjectId
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.core.database import get_database
from app.schemas.holiday import HolidayCreate, HolidayUpdate


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def holiday_helper(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "date": doc.get("date"),
        "description": doc.get("description"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


async def create_holiday(data: HolidayCreate) -> dict:
    db = get_database()
    holiday_dict = data.model_dump()
    now = _utc_now()
    holiday_dict["created_at"] = now
    holiday_dict["updated_at"] = now

    result = await db.holidays.insert_one(holiday_dict)
    new_doc = await db.holidays.find_one({"_id": result.inserted_id})
    return holiday_helper(new_doc)


async def get_all_holidays(year: Optional[int] = None) -> List[dict]:
    db = get_database()
    query = {}
    if year is not None:
        # Match dates starting with the year string, e.g. "2026-"
        query["date"] = {"$regex": f"^{year}-"}

    holidays = []
    cursor = db.holidays.find(query).sort("date", 1)
    async for doc in cursor:
        holidays.append(holiday_helper(doc))
    return holidays


async def get_holiday_by_id(holiday_id: str) -> Optional[dict]:
    db = get_database()
    if not ObjectId.is_valid(holiday_id):
        return None
    doc = await db.holidays.find_one({"_id": ObjectId(holiday_id)})
    return holiday_helper(doc) if doc else None


async def get_holiday_by_date(date_str: str) -> Optional[dict]:
    db = get_database()
    doc = await db.holidays.find_one({"date": date_str})
    return holiday_helper(doc) if doc else None


async def update_holiday(holiday_id: str, data: HolidayUpdate) -> Optional[dict]:
    db = get_database()
    if not ObjectId.is_valid(holiday_id):
        return None

    update_dict = data.model_dump(exclude_unset=True)
    if update_dict:
        update_dict["updated_at"] = _utc_now()
        result = await db.holidays.update_one(
            {"_id": ObjectId(holiday_id)},
            {"$set": update_dict}
        )
        if result.matched_count == 0:
            return None

    updated_doc = await db.holidays.find_one({"_id": ObjectId(holiday_id)})
    return holiday_helper(updated_doc) if updated_doc else None


async def delete_holiday(holiday_id: str) -> bool:
    db = get_database()
    if not ObjectId.is_valid(holiday_id):
        return False
    result = await db.holidays.delete_one({"_id": ObjectId(holiday_id)})
    return result.deleted_count > 0
