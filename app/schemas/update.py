from pydantic import BaseModel, Field, ConfigDict
from typing import Optional,List
from datetime import date, datetime

class ProjectInfo(BaseModel):
    project_name: str
    client: str
    task_description: str

class WeeklyUpdateBase(BaseModel):
    name: str = Field(..., example="Jane Doe")
    role: str = Field(..., example="Frontend Engineer")
    projects: List[ProjectInfo] = Field(..., example=[
        {
            "project_name": "Project Alpha",
            "client": "Client Beta",
            "task_description": "Worked on UI components"
        }
    ])
    # We use week_end_date (e.g., the Monday of that week) to easily group everyone's updates together
    week_end_date: date = Field(..., example="2026-04-06")
    username: str = Field(..., example="jane_doe")
    occupancy: Optional[float] = Field(default=None, example=75)
    seen_by_lead: Optional[bool] = Field(default=False, example=True)

class WeeklyUpdateCreate(WeeklyUpdateBase):
    pass

class WeeklyUpdateModify(BaseModel):
    name: Optional[str] = None
    empid: Optional[str] = None
    week_end_date: Optional[date] = None
    projects: Optional[List[ProjectInfo]] = None
    occupancy: Optional[float] = None
    seen_by_lead: Optional[bool] = None


class WeeklyUpdateResponse(WeeklyUpdateBase):
    id: str
    created_at: datetime
    
    model_config = ConfigDict(populate_by_name=True)