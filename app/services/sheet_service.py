from datetime import datetime

from fastapi import HTTPException, status

from app.core.database import get_database
from app.schemas.sheet import CreateSheetRequest, GetSheetRequest, UpdateSheetRequest
from app.services.shift_service import shift_helper
from app.services.zoho_sheet_manager import ZohoSheetManager


field_mapping = {
    "name": "Employee Name",
    "date": "Date",
    "actual_shift": "Hubble Shift Timings",
    "worked_shift": "Worked Shift Timings",
    "project": "Project Name",
    "reason": "Reason",
    "lead_approval": "Sandeep\nLead Approval\nYes/No",
    "hr_verification": "HR Verified\nBiometric\nYes/No",
    "manager_approval": "Vamsi Approval",
    "manager_remarks": "Manager Comments if any",
    "lead_hr_comments": "Lead/HR\ncomments",
}


_user_indexes_ensured = False


async def _ensure_user_sheet_indexes(db):
    global _user_indexes_ensured
    if _user_indexes_ensured:
        return

    await db.users.create_index("username")
    await db.users.create_index([("username", 1), ("manager_id", 1), ("position", 1)])
    _user_indexes_ensured = True


async def resolve_lead_sheet_name(current_user: dict, lead_id: str = None) -> str:
    db = get_database()
    await _ensure_user_sheet_indexes(db)
    position = (current_user.get("position") or "").strip().lower()
    username = (current_user.get("username") or "").strip().lower()
    normalized_lead_id = lead_id.strip().lower() if lead_id else None

    if position == "lead":
        resolved_lead_id = username
    elif position == "employee":
        resolved_lead_id = (current_user.get("lead_id") or "").strip().lower()
    elif position == "manager":
        if not normalized_lead_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="lead_id query parameter is required for managers.",
            )
        resolved_lead_id = normalized_lead_id
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employees, leads, and managers can access shift sheets.",
        )

    if not resolved_lead_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user is not assigned to a lead.",
        )

    lead = await db.users.find_one(
        {"username": resolved_lead_id},
        {"username": 1, "position": 1, "manager_id": 1, "shift_sheet_name": 1},
    )
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lead '{resolved_lead_id}' was not found.",
        )

    if (lead.get("position") or "").lower() != "lead":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User '{resolved_lead_id}' is not configured as a lead.",
        )

    if position == "manager" and lead.get("manager_id") != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Lead '{resolved_lead_id}' is not assigned to this manager.",
        )

    sheet_name = lead.get("shift_sheet_name")
    if isinstance(sheet_name, str):
        sheet_name = sheet_name.strip()
    if not sheet_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shift sheet name is not configured for lead '{resolved_lead_id}'.",
        )

    return sheet_name


async def _sheet_manager_for_user(current_user: dict, lead_id: str = None) -> ZohoSheetManager:
    sheet_name = await resolve_lead_sheet_name(current_user, lead_id)
    return ZohoSheetManager(worksheet_name=sheet_name)


def _shift_record_from_request(request: CreateSheetRequest) -> dict:
    if not request.record:
        raise HTTPException(status_code=422, detail="record is required")

    shift_record = {}
    for key, value in request.record.model_dump().items():
        zoho_field = field_mapping.get(key)
        if zoho_field:
            shift_record[zoho_field] = value
    return shift_record


def _record_identity_criteria(name: str, date: str) -> str:
    return f'"Date"="{date}" and "Employee Name"="{name}"'


def _build_fetch_criteria(request: GetSheetRequest) -> str:
    criteria = []

    if request.year and request.month:
        criteria.append(
            f'("Date" contains "{request.month}/{request.year}" '
            f'or "Date" contains "{request.month:02d}/{request.year}")'
        )
    if request.date:
        criteria.append(f'("Date" = "{request.date}")')
    if request.name:
        criteria.append(f'("Employee Name" = "{request.name}")')
    if request.status:
        status_value = "" if request.status == "Pending" else request.status
        criteria.append(f'("Sandeep\nLead Approval\nYes/No" = "{status_value}")')

    return " and ".join(criteria)


def _next_row_id(rows: list) -> int:
    last_row_id = 0
    for row in rows:
        try:
            last_row_id = int(row.get("#", 0))
        except (TypeError, ValueError):
            continue
    return last_row_id + 1


async def add_row_zoho_sheet(request: CreateSheetRequest, current_user: dict, lead_id: str = None):
    sheet_manager = await _sheet_manager_for_user(current_user, lead_id)
    shift_record = _shift_record_from_request(request)
    name = shift_record.get("Employee Name")
    date = shift_record.get("Date")
    criteria = _record_identity_criteria(name, date)

    if sheet_manager.fetch_records(header_row=1, criteria=criteria):
        raise HTTPException(
            status_code=400,
            detail=f"Duplicate record exists for Employee Name {name} on {date}",
        )

    rows = sheet_manager.fetch_records()
    shift_record["#"] = _next_row_id(rows)

    return {"status": "success", "info": sheet_manager.add_records([shift_record], header_row=1)}


async def get_zoho_sheet_data(request: GetSheetRequest, current_user: dict, lead_id: str = None):
    """
    Fetch records from Zoho Sheet and return normalized shift objects.
    """
    sheet_manager = await _sheet_manager_for_user(current_user, lead_id)
    records = sheet_manager.fetch_records(
        header_row=request.header_row,
        criteria=_build_fetch_criteria(request),
        page=request.page,
        per_page=request.per_page,
    )
    valid_records = [record for record in records if record.get("Employee Name") and record.get("Date")]
    shifts = sorted(
        [shift_helper(record) for record in valid_records],
        key=lambda shift: datetime.strptime(shift["date"], "%d/%m/%Y"),
        reverse=True,
    )

    return {
        "status": "success",
        "count": len(shifts),
        "data": shifts,
    }


async def update_row_zoho_sheet(
    request: UpdateSheetRequest,
    name: str,
    date: str,
    current_user: dict,
    lead_id: str = None,
):
    """
    Update the first matching shift record for an employee and date.
    """
    sheet_manager = await _sheet_manager_for_user(current_user, lead_id)
    shift_record = _shift_record_from_request(request)
    return sheet_manager.update_records(
        shift_record,
        criteria=_record_identity_criteria(name, date),
        header_row=request.header_row,
        first_match_only=True,
    )


async def delete_row_zoho_sheet(
    name: str,
    date: str,
    current_user: dict,
    lead_id: str = None,
):
    position = (current_user.get("position") or "").lower()
    if position not in {"lead", "manager"}:
        raise HTTPException(status_code=403, detail="Only leads and managers can delete shift records")

    sheet_manager = await _sheet_manager_for_user(current_user, lead_id)
    return sheet_manager.delete_records(
        criteria=_record_identity_criteria(name, date),
        delete_rows=True,
        first_match_only=True,
    )
