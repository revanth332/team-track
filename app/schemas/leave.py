from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime


class LeaveBase(BaseModel):
    username: str = Field(..., example="jdoe", description="Username of the employee")
    start_date: str = Field(..., example="2026-08-20", description="Start date of leave (YYYY-MM-DD)")
    end_date: str = Field(..., example="2026-08-22", description="End date of leave (YYYY-MM-DD)")
    reason: Optional[str] = Field(default=None, example="Personal / Sick leave")


class LeaveCreate(LeaveBase):
    pass


class LeaveUpdate(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    reason: Optional[str] = None
    status: Optional[Literal["active", "cancelled", "completed"]] = None


class LeaveResponse(LeaveBase):
    id: str
    lead_id: Optional[str] = None
    status: Literal["active", "cancelled", "completed"] = "active"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(populate_by_name=True)
