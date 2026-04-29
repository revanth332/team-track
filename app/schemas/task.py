from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


TaskStatus = Literal["Pending", "Submitted", "Approved", "Rejected"]


class LinkItem(BaseModel):
    name: str = Field(..., example="hacker rank")
    url: str = Field(..., example="https://www.hackerrank.com/challenges/py-if-else/problem")


class TaskBase(BaseModel):
    title: str = Field(..., example="Python Lists Challenge")
    problem_url: Optional[str] = Field(default=None, example="https://www.hackerrank.com/challenges/python-lists")
    description: Optional[str] = Field(default=None, example="Complete all test cases for the challenge.")
    tags: List[str] = Field(default_factory=list, example=["python", "sql"])


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    problem_url: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class TaskSubmission(BaseModel):
    screenshot_url: Optional[str] = Field(default=None, example="https://example.com/submissions/task-123.png")
    links: List[LinkItem] = Field(
        default_factory=list,
        example=[{"name": "hacker rank", "url": "https://www.hackerrank.com/challenges/py-if-else/problem"}],
    )
    notes: Optional[str] = Field(default=None, example="All public test cases passed.")

    @model_validator(mode="after")
    def require_submission_proof(self):
        has_screenshot = bool(self.screenshot_url and self.screenshot_url.strip())
        has_links = any(link.url and link.url.strip() for link in self.links)
        if not has_screenshot and not has_links:
            raise ValueError("Either screenshot_url or links is required")
        return self


class TaskReview(BaseModel):
    status: Literal["Approved", "Rejected"]
    review_comments: Optional[str] = Field(default=None, example="Verified successful test case completion.")


class TaskResponse(TaskBase):
    id: str
    username: str
    status: TaskStatus
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    screenshot_url: Optional[str] = None
    links: List[LinkItem] = Field(default_factory=list)
    submission_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_comments: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class TaskListResponse(BaseModel):
    status: str = "success"
    count: int
    total: int
    page: int
    per_page: int
    data: List[TaskResponse]
