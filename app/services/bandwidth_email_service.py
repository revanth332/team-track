import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.core.database import get_database
from app.core.encryption import encrypt_string, decrypt_string
from app.services.user_service import calculate_bandwidth, normalize_active_projects
from app.schemas.bandwidth import (
    BandwidthSettingsResponse,
    BandwidthSettingsUpdate,
    TestEmailRequest
)


def _format_settings_response(doc: dict) -> BandwidthSettingsResponse:
    return BandwidthSettingsResponse(
        lead_id=doc["lead_id"],
        is_enabled=doc.get("is_enabled", False),
        zoho_sender_email=doc.get("zoho_sender_email", ""),
        has_app_password=bool(doc.get("zoho_app_password")),
        zoho_server=doc.get("zoho_server", "smtp.zoho.com"),
        zoho_port=doc.get("zoho_port", 465),
        recipient_emails=doc.get("recipient_emails", []),
        min_bandwidth_threshold=doc.get("min_bandwidth_threshold", 0),
        updated_at=doc.get("updated_at"),
        last_run_at=doc.get("last_run_at"),
        last_run_status=doc.get("last_run_status"),
        last_error=doc.get("last_error")
    )


async def get_lead_bandwidth_settings(lead_id: str) -> Optional[BandwidthSettingsResponse]:
    db = get_database()
    doc = await db.bandwidth_settings.find_one({"lead_id": lead_id})
    if not doc:
        return None
    return _format_settings_response(doc)


async def save_lead_bandwidth_settings(
    lead_id: str, 
    data: BandwidthSettingsUpdate
) -> BandwidthSettingsResponse:
    db = get_database()
    existing = await db.bandwidth_settings.find_one({"lead_id": lead_id}) or {}

    update_doc: Dict[str, Any] = {
        "lead_id": lead_id,
        "updated_at": datetime.now(timezone.utc)
    }

    if data.is_enabled is not None:
        update_doc["is_enabled"] = data.is_enabled
    else:
        update_doc["is_enabled"] = existing.get("is_enabled", False)

    if data.zoho_sender_email is not None:
        update_doc["zoho_sender_email"] = data.zoho_sender_email.strip()
    else:
        update_doc["zoho_sender_email"] = existing.get("zoho_sender_email", "")

    if data.zoho_app_password:
        update_doc["zoho_app_password"] = encrypt_string(data.zoho_app_password.strip())
    else:
        update_doc["zoho_app_password"] = existing.get("zoho_app_password", "")

    if data.zoho_server is not None:
        update_doc["zoho_server"] = data.zoho_server.strip()
    else:
        update_doc["zoho_server"] = existing.get("zoho_server", "smtp.zoho.com")

    if data.zoho_port is not None:
        update_doc["zoho_port"] = data.zoho_port
    else:
        update_doc["zoho_port"] = existing.get("zoho_port", 465)

    if data.recipient_emails is not None:
        # Clean emails
        clean_emails = [e.strip() for e in data.recipient_emails if e.strip()]
        update_doc["recipient_emails"] = clean_emails
    else:
        update_doc["recipient_emails"] = existing.get("recipient_emails", [])

    if data.min_bandwidth_threshold is not None:
        update_doc["min_bandwidth_threshold"] = data.min_bandwidth_threshold
    else:
        update_doc["min_bandwidth_threshold"] = existing.get("min_bandwidth_threshold", 0)

    # Preserve last run stats
    update_doc["last_run_at"] = existing.get("last_run_at")
    update_doc["last_run_status"] = existing.get("last_run_status")
    update_doc["last_error"] = existing.get("last_error")

    await db.bandwidth_settings.update_one(
        {"lead_id": lead_id},
        {"$set": update_doc},
        upsert=True
    )

    updated_doc = await db.bandwidth_settings.find_one({"lead_id": lead_id})
    return _format_settings_response(updated_doc)


async def get_lead_members_with_bandwidth(lead_id: str, min_threshold: int = 0) -> List[Dict[str, Any]]:
    """
    Finds all team members managed by lead_id and calculates their available bandwidth.
    Filters members where bandwidth > min_threshold.
    """
    db = get_database()
    query = {"lead_id": lead_id, "position": {"$ne": "superadmin"}}
    
    available_members = []
    today = datetime.now(timezone.utc).date()
    
    async for user in db.users.find(query).sort("name", 1):
        active_projects = normalize_active_projects(user.get("active_projects", []))
        last_updated = user.get("last_updated")
        
        is_updated_today = False
        if last_updated:
            if hasattr(last_updated, "date"):
                if last_updated.tzinfo is None:
                    last_updated = last_updated.replace(tzinfo=timezone.utc)
                is_updated_today = last_updated.astimezone(timezone.utc).date() == today
            elif isinstance(last_updated, str):
                try:
                    dt = datetime.fromisoformat(last_updated.replace("Z", "+00:00"))
                    is_updated_today = dt.astimezone(timezone.utc).date() == today
                except ValueError:
                    pass

        if is_updated_today:
            bandwidth = calculate_bandwidth(active_projects)
        else:
            for p in active_projects:
                p["occupancy"] = 0
            bandwidth = 100
        
        if bandwidth > min_threshold:
            # Active project names and occupancy
            active_list = [
                f"{p['title']} ({p['occupancy']}%)"
                for p in active_projects if p.get("is_active", True)
            ]
            
            available_members.append({
                "id": str(user["_id"]),
                "name": user.get("name", "N/A"),
                "username": user.get("username", ""),
                "email": user.get("email", ""),
                "role": user.get("role", "Team Member"),
                "bandwidth": bandwidth,
                "active_projects": active_list,
                "skills": user.get("skills", []),
            })
            
    return available_members


def build_bandwidth_email_html(lead_name: str, members: List[Dict[str, Any]], min_threshold: int) -> str:
    today_str = datetime.now().strftime("%B %d, %Y")
    
    rows_html = ""
    for m in members:
        rows_html += f"""
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; font-weight: 600; color: #1f2937;">{m['name']}<br><span style="font-size: 11px; color: #6b7280; font-weight: normal;">{m['email']}</span></td>
          <td style="padding: 12px 16px; color: #4b5563;">{m['role']}</td>
          <td style="padding: 12px 16px; text-align: center;">
            <span style="display: inline-block; padding: 4px 10px; background-color: #dcfce7; color: #15803d; font-weight: 700; border-radius: 12px; font-size: 13px;">
              {m['bandwidth']}% Available
            </span>
          </td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Daily Bandwidth Alert</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px; color: #111827;">
      <div style="max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700; tracking-tight: -0.025em;">Available Team Bandwidth Report</h2>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Team Lead: <strong>{lead_name}</strong> | Date: <strong>{today_str}</strong></p>
        </div>
        
        <div style="padding: 24px;">
          <p style="margin-top: 0; font-size: 14px; color: #4b5563; line-height: 1.5;">
            Below is the daily snapshot of team members under <strong>{lead_name}</strong> who currently have available bandwidth (bandwidth &gt; {min_threshold}%):
          </p>

          <div style="overflow-x: auto; margin-top: 16px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
              <thead>
                <tr style="background-color: #f3f4f6; color: #374151; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">
                  <th style="padding: 10px 16px; border-radius: 8px 0 0 8px;">Member</th>
                  <th style="padding: 10px 16px;">Role</th>
                  <th style="padding: 10px 16px; text-align: center; border-radius: 0 8px 8px 0;">Bandwidth</th>
                </tr>
              </thead>
              <tbody>
                {rows_html}
              </tbody>
            </table>
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f3f4f6; font-size: 11px; color: #9ca3af; text-align: center;">
            This automated email was sent by TeamTrack at 5:00 PM IST because team members with available capacity were identified.
          </div>
        </div>
      </div>
    </body>
    </html>
    """
    return html


async def send_zoho_bandwidth_email(
    server: str,
    port: int,
    sender_email: str,
    app_password: str,
    recipients: List[str],
    subject: str,
    html_content: str
):
    """
    Sends an email via Zoho SMTP SSL securely using a thread pool to avoid blocking the async event loop.
    """
    def _send():
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = sender_email
        msg["To"] = ", ".join(recipients)
        msg.attach(MIMEText(html_content, "html"))

        # Zoho SMTP SSL Connection
        with smtplib.SMTP_SSL(server, port, timeout=12) as mailer:
            mailer.login(sender_email, app_password)
            mailer.sendmail(sender_email, recipients, msg.as_string())

    await asyncio.to_thread(_send)


async def test_zoho_credentials(lead_id: str, test_req: TestEmailRequest) -> Dict[str, Any]:
    db = get_database()
    setting = await db.bandwidth_settings.find_one({"lead_id": lead_id}) or {}

    # Read overrides or settings
    sender_email = (test_req.zoho_sender_email or setting.get("zoho_sender_email") or "").strip()
    raw_password = test_req.zoho_app_password
    if not raw_password and setting.get("zoho_app_password"):
        raw_password = decrypt_string(setting["zoho_app_password"])
    
    server = (test_req.zoho_server or setting.get("zoho_server") or "smtp.zoho.com").strip()
    port = test_req.zoho_port or setting.get("zoho_port") or 465

    target_email = (test_req.test_recipient_email or "").strip()
    if not target_email:
        recipients = setting.get("recipient_emails", [])
        target_email = recipients[0] if recipients else sender_email

    if not sender_email or not raw_password or not target_email:
        return {
            "success": False,
            "message": "Missing required Zoho credentials or recipient email address."
        }

    # Fetch lead name
    lead_user = await db.users.find_one({"username": lead_id})
    lead_name = lead_user.get("name") if lead_user else lead_id

    # Get members for test content
    members = await get_lead_members_with_bandwidth(lead_id, 0)
    if not members:
        # Dummy member for test
        members = [{
            "name": "Sample Team Member",
            "email": "sample.member@company.com",
            "role": "Frontend Developer",
            "bandwidth": 50,
            "active_projects": ["Project Alpha (50%)"],
            "skills": ["React", "TypeScript"]
        }]

    html_content = build_bandwidth_email_html(lead_name, members, 0)
    subject = f"[TEST] TeamTrack Available Bandwidth Alert - {lead_name}"

    try:
        await send_zoho_bandwidth_email(
            server=server,
            port=port,
            sender_email=sender_email,
            app_password=raw_password,
            recipients=[target_email],
            subject=subject,
            html_content=html_content
        )
        return {
            "success": True,
            "message": f"Test email sent successfully to {target_email} via {server}:{port}!"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Zoho SMTP Authentication/Connection Error: {str(e)}"
        }


async def process_daily_bandwidth_emails() -> Dict[str, Any]:
    """
    Cron Job Worker:
    1. Finds all bandwidth_settings with is_enabled == True.
    2. Evaluates members with bandwidth > min_bandwidth_threshold.
    3. If members exist, sends Zoho mail and updates last_run_status = 'SUCCESS'.
    4. If no members exist, skips mail and updates last_run_status = 'SKIPPED_NO_BANDWIDTH_MEMBERS'.
    """
    db = get_database()
    enabled_cursor = db.bandwidth_settings.find({"is_enabled": True})
    
    results = []
    
    async for setting in enabled_cursor:
        lead_id = setting["lead_id"]
        lead_user = await db.users.find_one({"username": lead_id})
        lead_name = lead_user.get("name") if lead_user else lead_id
        
        min_threshold = setting.get("min_bandwidth_threshold", 0)
        recipients = setting.get("recipient_emails", [])
        sender_email = setting.get("zoho_sender_email")
        encrypted_pass = setting.get("zoho_app_password")
        server = setting.get("zoho_server", "smtp.zoho.com")
        port = setting.get("zoho_port", 465)
        
        now = datetime.now(timezone.utc)

        # Basic verification
        if not sender_email or not encrypted_pass or not recipients:
            await db.bandwidth_settings.update_one(
                {"lead_id": lead_id},
                {
                    "$set": {
                        "last_run_at": now,
                        "last_run_status": "ERROR",
                        "last_error": "Missing Zoho credentials or recipient emails configuration."
                    }
                }
            )
            results.append({"lead_id": lead_id, "status": "ERROR", "reason": "Incomplete Configuration"})
            continue

        # Check bandwidth members
        members = await get_lead_members_with_bandwidth(lead_id, min_threshold)
        
        if not members:
            # Skip email because no members have bandwidth
            await db.bandwidth_settings.update_one(
                {"lead_id": lead_id},
                {
                    "$set": {
                        "last_run_at": now,
                        "last_run_status": "SKIPPED_NO_BANDWIDTH_MEMBERS",
                        "last_error": None
                    }
                }
            )
            results.append({"lead_id": lead_id, "status": "SKIPPED", "reason": "No members with available bandwidth"})
            continue

        # Decrypt password & send
        app_password = decrypt_string(encrypted_pass)
        if not app_password:
            await db.bandwidth_settings.update_one(
                {"lead_id": lead_id},
                {
                    "$set": {
                        "last_run_at": now,
                        "last_run_status": "ERROR",
                        "last_error": "Failed to decrypt saved Zoho App Password."
                    }
                }
            )
            results.append({"lead_id": lead_id, "status": "ERROR", "reason": "Decryption Failed"})
            continue

        subject = f"TeamTrack Daily Bandwidth Alert - {lead_name} ({len(members)} Member(s) Available)"
        html_content = build_bandwidth_email_html(lead_name, members, min_threshold)

        try:
            await send_zoho_bandwidth_email(
                server=server,
                port=port,
                sender_email=sender_email,
                app_password=app_password,
                recipients=recipients,
                subject=subject,
                html_content=html_content
            )
            await db.bandwidth_settings.update_one(
                {"lead_id": lead_id},
                {
                    "$set": {
                        "last_run_at": now,
                        "last_run_status": "SUCCESS",
                        "last_error": None
                    }
                }
            )
            results.append({"lead_id": lead_id, "status": "SUCCESS", "members_count": len(members)})
        except Exception as e:
            await db.bandwidth_settings.update_one(
                {"lead_id": lead_id},
                {
                    "$set": {
                        "last_run_at": now,
                        "last_run_status": "ERROR",
                        "last_error": str(e)
                    }
                }
            )
            results.append({"lead_id": lead_id, "status": "ERROR", "reason": str(e)})

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "processed_teams": len(results),
        "details": results
    }
