from pydantic import AliasChoices, BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import date, time

class BandWidth(BaseModel):
    percentage: int = Field(..., example=75)
    hours: float = Field(..., example=2)

# Base model containing the common fields
class UserBase(BaseModel):
    name: str = Field(..., example="Jane Doe")
    username: str = Field(..., example="jdoe")
    email: str = Field(..., example="jane.doe@company.com")
    empid: str = Field(default="", example="6062")
    image: Optional[str] = Field(default=None, example="https://s3.aws.com/profile.jpg")
    role: str = Field(default="member", example="Frontend Developer")
    lead_id: Optional[str] = Field(default=None, example="lead_username")
    manager_id: Optional[str] = Field(default=None, example="manager_username")
    position: Optional[str] = Field(default=None, example="employee")
    active_projects: List[str] = Field(default_factory=list, example=["Project Alpha", "Core App"])
    bandwidth: BandWidth = Field(
        default_factory=lambda: BandWidth(percentage=100, hours=0),
        example={"percentage": 75, "hours": 2},
    )
    
    # Replaced shift string with start and end times
    shift_start: time = Field(default=time(9, 0), example="16:00:00") # 4:00 PM
    shift_end: time = Field(default=time(1, 0), example="01:00:00")   # 1:00 AM
    
    skills: List[str] = Field(default_factory=list, example=["React", "TypeScript"])
    birthday: Optional[date] = Field(default=None, example="1995-08-15")

# Schema for creating a user (POST)
class UserCreate(UserBase):
    password: Optional[str] = Field(default=None, min_length=8, exclude=True)


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, example="jdoe")
    full_name: str = Field(
        ...,
        min_length=1,
        validation_alias=AliasChoices("full_name", "Full Name", "name"),
        example="Jane Doe",
    )
    email: str = Field(..., example="jane.doe@company.com")
    password: str = Field(..., min_length=8, example="change-me-123")


class UserAssign(BaseModel):
    usernames: List[str] = Field(..., min_length=1, example=["employee_username"])
    lead_id: Optional[str] = Field(default=None, example="lead_username")
    manager_id: Optional[str] = Field(default=None, example="manager_username")


class UserPositionAssign(BaseModel):
    username: str = Field(..., min_length=3, example="employee_username")
    position: str = Field(..., example="employee")


class UserDeAssign(BaseModel):
    username: str = Field(..., min_length=3, example="employee_username")

# Schema for updating a user (PUT/PATCH)
class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    empid: Optional[str] = None
    image: Optional[str] = None
    role: Optional[str] = None
    lead_id: Optional[str] = None
    manager_id: Optional[str] = None
    position: Optional[str] = None
    active_projects: Optional[List[str]] = None
    shift_start: Optional[time] = None
    shift_end: Optional[time] = None
    skills: Optional[List[str]] = None
    birthday: Optional[date] = None
    bandwidth: Optional[BandWidth] = None

# Schema for sending data back to frontend (Response)
class UserResponse(UserBase):
    id: str 
    model_config = ConfigDict(populate_by_name=True)

class UserSummaryResponse(BaseModel):
    name: str
    username: str

class UserBandwidthResponse(BaseModel):
    name: str
    username: str
    bandwidth: int

class PaginatedUsersResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    limit: int
    total_pages: int
