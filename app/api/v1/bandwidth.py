from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from typing import Optional

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.schemas.bandwidth import (
    BandwidthSettingsResponse,
    BandwidthSettingsUpdate,
    TestEmailRequest
)
from app.services.bandwidth_email_service import (
    get_lead_bandwidth_settings,
    save_lead_bandwidth_settings,
    test_zoho_credentials,
    process_daily_bandwidth_emails
)

router = APIRouter()


@router.get("/settings", response_model=BandwidthSettingsResponse)
async def get_settings(current_user: dict = Depends(get_current_user)):
    username = current_user["username"]
    res = await get_lead_bandwidth_settings(username)
    if not res:
        return BandwidthSettingsResponse(
            lead_id=username,
            is_enabled=False,
            zoho_sender_email="",
            has_app_password=False,
            zoho_server="smtp.zoho.com",
            zoho_port=465,
            recipient_emails=[],
            min_bandwidth_threshold=0
        )
    return res


@router.post("/settings", response_model=BandwidthSettingsResponse)
async def update_settings(
    payload: BandwidthSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    username = current_user["username"]
    position = (current_user.get("position") or "").lower()
    
    # Allow leads, managers, and admins to configure
    if position not in ["lead", "manager", "admin"] and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only leads or managers can configure bandwidth mail notifications."
        )

    updated = await save_lead_bandwidth_settings(username, payload)
    return updated


@router.post("/test")
async def trigger_test_email(
    payload: TestEmailRequest,
    current_user: dict = Depends(get_current_user)
):
    username = current_user["username"]
    result = await test_zoho_credentials(username, payload)
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    return result


@router.get("/cron")
@router.post("/cron")
async def execute_cron_bandwidth_job(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_cron_secret: Optional[str] = Header(None, alias="X-Cron-Secret"),
    x_vercel_cron: Optional[str] = Header(None, alias="X-Vercel-Cron"),
    cron_secret: Optional[str] = Query(None)
):
    provided_secret = x_cron_secret or cron_secret
    if not provided_secret and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            provided_secret = parts[1].strip()

    # Match against configured CRON_SECRET
    is_valid_secret = bool(provided_secret and settings.CRON_SECRET and provided_secret == settings.CRON_SECRET)
    
    # Check if request originated directly from Vercel Cron infrastructure
    is_vercel_cron = x_vercel_cron is not None

    if not is_valid_secret and not is_vercel_cron:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Cron Secret header."
        )

    res = await process_daily_bandwidth_emails()
    return res
