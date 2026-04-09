from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import date, time

# Base model containing the common fields
class UserBase(BaseModel):
    name: str = Field(..., example="Jane Doe")
    username: str = Field(..., example="jdoe")
    email: str = Field(..., example="jane.doe@company.com")
    empid: str = Field(..., example="6062")
    image: Optional[str] = Field(default=None, example="https://s3.aws.com/profile.jpg")
    role: str = Field(..., example="Frontend Developer")
    active_projects: List[str] = Field(default=[], example=["Project Alpha", "Core App"])
    
    # Replaced shift string with start and end times
    shift_start: time = Field(default=time(9, 0), example="16:00:00") # 4:00 PM
    shift_end: time = Field(default=time(1, 0), example="01:00:00")   # 1:00 AM
    
    skills: List[str] = Field(default=[], example=["React", "TypeScript"])
    birthday: Optional[date] = Field(default=None, example="1995-08-15")

# Schema for creating a user (POST)
class UserCreate(UserBase):
    pass

# Schema for updating a user (PUT/PATCH)
class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    empid: Optional[str] = None
    image: Optional[str] = None
    role: Optional[str] = None
    active_projects: Optional[List[str]] = None
    shift_start: Optional[time] = None
    shift_end: Optional[time] = None
    skills: Optional[List[str]] = None
    birthday: Optional[date] = None

# Schema for sending data back to frontend (Response)
class UserResponse(UserBase):
    id: str 
    model_config = ConfigDict(populate_by_name=True)