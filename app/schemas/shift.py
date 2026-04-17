from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any, Dict
from datetime import date, time, datetime

class ShiftBase(BaseModel):
    name: Optional[str] = Field(default=None, example="Jane Doe")
    date: Optional[str] = Field(default=None, example="2026-04-15")
    actual_shift: Optional[str] = Field(default=None, example="09:00:00 - 17:00:00")
    worked_shift: Optional[str] = Field(default=None, example="11:00:00 - 19:00:00")
    project: Optional[str] = Field(default=None, example="Project Alpha")
    reason: Optional[str] = Field(default=None, example="Reason for shift change")
    lead_approval: Optional[str] = Field(default=None, example="Approved/Rejected")
    hr_verification: Optional[str] = Field(default=None, example="Yes/No")
    manager_approval: Optional[str] = Field(default=None, example="Approved/Rejected")
    manager_remarks: Optional[str] = Field(default=None, example="Manager's comments")
    hr_lead_comments: Optional[str] = Field(default=None, example="HR/Lead's comments")


class ShiftResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    status: Optional[str] = None