from bson import ObjectId
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from app.core.database import get_database
from app.schemas.leave import LeaveCreate, LeaveUpdate

IST = timezone(timedelta(hours=5, minutes=30))


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_today_ist() -> datetime:
    return datetime.now(timezone.utc).astimezone(IST)


def get_today_ist_str() -> str:
    return get_today_ist().strftime("%Y-%m-%d")


def leave_helper(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "username": doc.get("username"),
        "lead_id": doc.get("lead_id"),
        "start_date": doc.get("start_date"),
        "end_date": doc.get("end_date"),
        "reason": doc.get("reason"),
        "status": doc.get("status", "active"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


async def create_leave(data: LeaveCreate, lead_id: Optional[str] = None) -> dict:
    db = get_database()
    now = _utc_now()
    leave_dict = data.model_dump()
    leave_dict["username"] = leave_dict["username"].strip().lower()
    leave_dict["lead_id"] = lead_id.strip().lower() if lead_id else None
    leave_dict["status"] = "active"
    leave_dict["created_at"] = now
    leave_dict["updated_at"] = now

    result = await db.leaves.insert_one(leave_dict)
    new_doc = await db.leaves.find_one({"_id": result.inserted_id})
    return leave_helper(new_doc)


async def get_active_leaves(lead_id: Optional[str] = None, date_str: Optional[str] = None) -> List[dict]:
    db = get_database()
    target_date = date_str or get_today_ist_str()
    query: Dict[str, Any] = {
        "status": "active",
        "start_date": {"$lte": target_date},
        "end_date": {"$gte": target_date},
    }
    if lead_id:
        query["lead_id"] = lead_id.strip().lower()

    leaves = []
    cursor = db.leaves.find(query).sort("start_date", 1)
    async for doc in cursor:
        leaves.append(leave_helper(doc))
    return leaves


async def get_active_leave_for_user(username: str, date_str: Optional[str] = None) -> Optional[dict]:
    db = get_database()
    target_date = date_str or get_today_ist_str()
    doc = await db.leaves.find_one({
        "username": username.strip().lower(),
        "status": "active",
        "start_date": {"$lte": target_date},
        "end_date": {"$gte": target_date},
    })
    return leave_helper(doc) if doc else None


async def get_leaves_for_user(username: str) -> List[dict]:
    db = get_database()
    leaves = []
    cursor = db.leaves.find({"username": username.strip().lower()}).sort("start_date", -1)
    async for doc in cursor:
        leaves.append(leave_helper(doc))
    return leaves


async def end_leave_early(leave_id: str) -> Optional[dict]:
    db = get_database()
    if not ObjectId.is_valid(leave_id):
        return None

    leave = await db.leaves.find_one({"_id": ObjectId(leave_id)})
    if not leave:
        return None

    today_dt = get_today_ist()
    today_str = today_dt.strftime("%Y-%m-%d")
    start_date = leave.get("start_date", "")

    now = _utc_now()
    if start_date >= today_str:
        # Leave started today or is scheduled for the future: cancel it
        update_dict = {
            "status": "cancelled",
            "updated_at": now,
        }
    else:
        # Leave started in the past: truncate end_date to yesterday so past records remain preserved
        yesterday_str = (today_dt - timedelta(days=1)).strftime("%Y-%m-%d")
        update_dict = {
            "end_date": yesterday_str,
            "status": "completed",
            "updated_at": now,
        }

    await db.leaves.update_one({"_id": ObjectId(leave_id)}, {"$set": update_dict})
    updated_doc = await db.leaves.find_one({"_id": ObjectId(leave_id)})
    return leave_helper(updated_doc) if updated_doc else None


async def delete_leave(leave_id: str) -> bool:
    db = get_database()
    if not ObjectId.is_valid(leave_id):
        return False
    result = await db.leaves.delete_one({"_id": ObjectId(leave_id)})
    return result.deleted_count > 0
