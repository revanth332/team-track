from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime


class BandwidthSettingsBase(BaseModel):
    is_enabled: bool = Field(default=False, description="Toggle whether daily 5 PM emails are enabled")
    zoho_sender_email: str = Field(..., description="Zoho email address of the lead sending the report")
    zoho_server: str = Field(default="smtp.zoho.com", description="Zoho SMTP server host (e.g., smtp.zoho.com or smtp.zoho.in)")
    zoho_port: int = Field(default=465, description="Zoho SMTP SSL Port (default: 465)")
    recipient_emails: List[str] = Field(default_factory=list, description="Target recipient email addresses")
    min_bandwidth_threshold: int = Field(default=0, ge=0, le=99, description="Minimum bandwidth percentage threshold to include member")


class BandwidthSettingsCreate(BandwidthSettingsBase):
    zoho_app_password: str = Field(..., description="Zoho App Password generated from Zoho Security settings")


class BandwidthSettingsUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    zoho_sender_email: Optional[str] = None
    zoho_app_password: Optional[str] = Field(default=None, description="Provide only if updating the password")
    zoho_server: Optional[str] = None
    zoho_port: Optional[int] = None
    recipient_emails: Optional[List[str]] = None
    min_bandwidth_threshold: Optional[int] = Field(default=None, ge=0, le=99)


class BandwidthSettingsResponse(BandwidthSettingsBase):
    lead_id: str
    has_app_password: bool = Field(..., description="Indicates if an app password is configured without revealing it")
    updated_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None
    last_error: Optional[str] = None


class TestEmailRequest(BaseModel):
    test_recipient_email: Optional[str] = Field(default=None, description="Optional override recipient email for testing")
    zoho_sender_email: Optional[str] = None
    zoho_app_password: Optional[str] = None
    zoho_server: Optional[str] = None
    zoho_port: Optional[int] = None
