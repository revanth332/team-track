from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class IdeaBase(BaseModel):
    username: str = Field(..., example="jane.doe@company.com")
    title: str = Field(..., example="System Design Crash Course Video")
    description: str = Field(..., example="A 10-minute video explaining load balancers.")
    links: List[str] = Field(default=[], example=["https://example.com/reference"])
    approved: Optional[bool] = Field(default=None, example=True)
    assigned_to: Optional[str] = Field(default=None, example="john.doe@company.com")

class IdeaCreate(IdeaBase):
    pass

class IdeaUpdate(BaseModel):
    username: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    links: Optional[List[str]] = None
    approved: Optional[bool] = None
    assigned_to: Optional[str] = None

class IdeaResponse(IdeaBase):
    id: str
    created_at: datetime
    
    model_config = ConfigDict(populate_by_name=True)