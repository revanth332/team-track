from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date, time, datetime

class ShiftBase(BaseModel):
    name: str = Field(..., example="Jane Doe")
    empid: str = Field(..., example="EMP-1042")
    name: str = Field(..., example="Jane Doe")
    empid: str = Field(..., example="EMP-1042")
    date: str = Field(..., example="2026-04-15")
    actual_shift: str = Field(..., example="09:00:00 - 17:00:00")
    worked_shift: str = Field(..., example="11:00:00 - 19:00:00")
    project: str = Field(..., example="Project Alpha")
    reason: str = Field(..., example="Reason for shift change")
    lead_approval: Optional[str] = Field(..., example="Approved/Rejected")
    lead_remarks: Optional[str] = Field(default=None, example="Lead's comments")
    hr_verification: Optional[str] = Field(..., example="Yes/No")
    manager_approval: Optional[str] = Field(..., example="Approved/Rejected")
    manager_remarks: Optional[str] = Field(default=None, example="Manager's comments")
    hr_lead_comments: Optional[str] = Field(default=None, example="HR/Lead's comments")


class ShiftResponse(BaseModel):
    status: str
    info: dict