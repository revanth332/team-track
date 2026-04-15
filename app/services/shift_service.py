from app.core.database import get_database

def shift_helper(shift) -> dict:
    return {
        "id": str(shift["#"]),
        "name": shift.get("Employee Name"),
        "empid": shift.get("Emp ID"),
        "date": shift.get("Date"),
        "actual_shift":shift.get("Hubble Shift Timings"),
        "worked_shift": shift.get("Worked Shift Timings"),
        "project": shift.get("Project Name"),
        "reason": shift.get("Reason"),
        "lead_approval": shift.get("Sandeep Lead Approval"),
        "lead_remarks": shift.get("Lead Remarks"),
        "hr_verication": shift.get("HR Verified Yes/No"),
        "manager_approval": shift.get("Vamsi Nadenlda Approval"),
        "manager_remarks": shift.get("Manager Comments if any"),
        "hr_lead_comments": shift.get("Lead/HR comments"),
        "row_index": shift.get("row_index")
    }