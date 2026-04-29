from datetime import datetime

from fastapi import HTTPException

from app.schemas.sheet import CreateSheetRequest, GetSheetRequest, UpdateSheetRequest
from app.services.shift_service import shift_helper
from app.services.zoho_sheet_manager import ZohoSheetManager


sheet_manager = ZohoSheetManager()

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


async def add_row_zoho_sheet(request: CreateSheetRequest):
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


async def get_zoho_sheet_data(request: GetSheetRequest):
    """
    Fetch records from Zoho Sheet and return normalized shift objects.
    """
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


async def update_row_zoho_sheet(request: UpdateSheetRequest, name: str, date: str):
    """
    Update the first matching shift record for an employee and date.
    """
    shift_record = _shift_record_from_request(request)
    return sheet_manager.update_records(
        shift_record,
        criteria=_record_identity_criteria(name, date),
        header_row=request.header_row,
        first_match_only=True,
    )


async def delete_row_zoho_sheet(name: str, date: str, is_admin: bool):
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can delete records")

    return sheet_manager.delete_records(
        criteria=_record_identity_criteria(name, date),
        delete_rows=True,
        first_match_only=True,
    )
