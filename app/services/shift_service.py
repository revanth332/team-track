def lead_approval_field(sheet_name: str) -> str:
    return f"{sheet_name}\nLead Approval\nYes/No"


def shift_helper(shift, sheet_name: str) -> dict:
    return {
        "id": str(shift["#"]),
        "name": shift.get("Employee Name"),
        "date": shift.get("Date"),
        "actual_shift":shift.get("Hubble Shift Timings"),
        "worked_shift": shift.get("Worked Shift Timings"),
        "project": shift.get("Project Name"),
        "reason": shift.get("Reason"),
        "lead_approval": shift.get(lead_approval_field(sheet_name)),
        "hr_verification": shift.get("HR Verified\nBiometric\nYes/No"),
        "manager_approval": shift.get("Vamsi Approval"),
        "manager_remarks": shift.get("Manager Comments if any"),
        "lead_hr_comments": shift.get("Lead/HR\ncomments"),
        "row_index": shift.get("row_index")
    }
