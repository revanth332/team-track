from bson import ObjectId
from datetime import datetime, timezone

from app.core.database import get_database
from app.schemas.task import TaskCreate, TaskReview, TaskSubmission, TaskUpdate


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def task_helper(task_doc) -> dict:
    return {
        "id": str(task_doc["_id"]),
        "username": task_doc.get("username") or task_doc.get("assignee_username"),
        "title": task_doc.get("title"),
        "problem_url": task_doc.get("problem_url"),
        "description": task_doc.get("description"),
        "tags": task_doc.get("tags", []),
        "status": task_doc.get("status", "Pending"),
        "created_by": task_doc.get("created_by"),
        "created_at": task_doc.get("created_at"),
        "updated_at": task_doc.get("updated_at"),
        "submitted_at": task_doc.get("submitted_at"),
        "screenshot_url": task_doc.get("screenshot_url"),
        "submission_notes": task_doc.get("submission_notes"),
        "reviewed_by": task_doc.get("reviewed_by"),
        "reviewed_at": task_doc.get("reviewed_at"),
        "review_comments": task_doc.get("review_comments"),
    }


async def create_task(task_data: TaskCreate, username: str, created_by: str):
    db = get_database()
    task_dict = task_data.model_dump()
    task_dict["username"] = username
    task_dict["created_by"] = created_by
    task_dict["status"] = "Pending"
    task_dict["created_at"] = _utc_now()

    result = await db.tasks.insert_one(task_dict)
    new_task = await db.tasks.find_one({"_id": result.inserted_id})
    return task_helper(new_task)


async def get_task_by_id(task_id: str):
    db = get_database()
    if not ObjectId.is_valid(task_id):
        return None
    task_doc = await db.tasks.find_one({"_id": ObjectId(task_id)})
    return task_helper(task_doc) if task_doc else None


async def get_all_tasks(
    username: str = None,
    status: str = None,
    tag: str = None,
):
    db = get_database()
    query = {}
    if username:
        query["username"] = username
    if status:
        query["status"] = status
    if tag:
        query["tags"] = tag

    tasks = []
    async for task in db.tasks.find(query).sort("created_at", -1):
        tasks.append(task_helper(task))
    return tasks


async def update_task(task_id: str, task_data: TaskUpdate):
    db = get_database()
    if not ObjectId.is_valid(task_id):
        return None

    update_dict = task_data.model_dump(exclude_unset=True)
    if update_dict:
        update_dict["updated_at"] = _utc_now()
        await db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": update_dict})

    updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    return task_helper(updated_task) if updated_task else None


async def submit_task(task_id: str, submission: TaskSubmission, username: str):
    db = get_database()
    if not ObjectId.is_valid(task_id):
        return None, "not_found"

    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        return None, "not_found"
    if task.get("username") != username:
        return None, "forbidden"

    now = _utc_now()
    submission_dict = submission.model_dump(exclude_unset=True)
    update_dict = {
        "status": "Submitted",
        "submitted_at": now,
        "updated_at": now,
        "screenshot_url": submission_dict.get("screenshot_url"),
        "submission_notes": submission_dict.get("notes"),
    }

    await db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": update_dict})
    updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    return task_helper(updated_task), None


async def review_task(task_id: str, review: TaskReview, reviewed_by: str):
    db = get_database()
    if not ObjectId.is_valid(task_id):
        return None

    update_dict = {
        "status": review.status,
        "review_comments": review.review_comments,
        "reviewed_by": reviewed_by,
        "reviewed_at": _utc_now(),
        "updated_at": _utc_now(),
    }
    await db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": update_dict})
    updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    return task_helper(updated_task) if updated_task else None


async def delete_task(task_id: str):
    db = get_database()
    if not ObjectId.is_valid(task_id):
        return False
    result = await db.tasks.delete_one({"_id": ObjectId(task_id)})
    return result.deleted_count > 0
