from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import date, datetime

class ProjectInfo(BaseModel):
    project_name: str
    client: str
    role: Optional[str] = Field(default=None, example="Frontend Engineer")
    task_description: str
    remarks_risks_dependencies: Optional[str] = Field(default="", example="None")
    accomplishments_highlights: Optional[str] = Field(default="", example="Completed phase 1")
    business_impact: Optional[str] = Field(default="", example="Improved performance by 20%")

class ProjectInfoCreate(BaseModel):
    project_name: str = Field(..., min_length=1)
    client: str = Field(..., min_length=1)
    role: Optional[str] = Field(default=None, example="Frontend Engineer")
    task_description: str = Field(..., min_length=1)
    remarks_risks_dependencies: str = Field(..., min_length=1)
    accomplishments_highlights: str = Field(..., min_length=1)
    business_impact: str = Field(..., min_length=1)

    @field_validator('task_description', 'remarks_risks_dependencies', 'accomplishments_highlights', 'business_impact', mode='before')
    @classmethod
    def validate_non_empty_text(cls, v):
        if isinstance(v, str):
            clean_text = v.replace('<p>', '').replace('</p>', '').replace('<br>', '').replace('<br/>', '').strip()
            if not clean_text:
                raise ValueError("This field cannot be empty.")
            return v.strip()
        if v is None:
            raise ValueError("This field is required.")
        return v

class WeeklyUpdateBase(BaseModel):
    name: str = Field(..., example="Jane Doe")
    projects: List[ProjectInfo] = Field(..., example=[
        {
            "project_name": "Project Alpha",
            "client": "Client Beta",
            "role": "Frontend Engineer",
            "task_description": "Worked on UI components",
            "remarks_risks_dependencies": "None",
            "accomplishments_highlights": "Phase 1 done",
            "business_impact": "20% speedup"
        }
    ])
    week_end_date: date = Field(..., example="2026-04-06")
    username: str = Field(..., example="jane_doe")
    occupancy: Optional[float] = Field(default=0.0, example=75)
    seen_by_lead: Optional[bool] = Field(default=False, example=True)
    lead_id: Optional[str] = Field(default=None, example="lead_username")
    manager_id: Optional[str] = Field(default=None, example="manager_username")

class WeeklyUpdateCreate(WeeklyUpdateBase):
    projects: List[ProjectInfoCreate] = Field(..., min_length=1)
    occupancy: float = Field(..., ge=1, le=100, example=75)

class WeeklyUpdateModify(BaseModel):
    name: Optional[str] = None
    empid: Optional[str] = None
    week_end_date: Optional[date] = None
    projects: Optional[List[ProjectInfoCreate]] = None
    occupancy: Optional[float] = Field(default=None, ge=1, le=100)
    seen_by_lead: Optional[bool] = None


class WeeklyUpdateResponse(WeeklyUpdateBase):
    id: str
    created_at: datetime
    
    model_config = ConfigDict(populate_by_name=True)
