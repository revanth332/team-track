
import os
import json
from fastapi import APIRouter, HTTPException
from app.core.token_manager import TokenManager
from app.schemas.sheet import UpdateSheetRequest, GetSheetRequest
from dotenv import load_dotenv
import requests

from app.schemas.shift import ShiftCreate
from app.schemas.shift import ShiftCreate
from app.services.shift_service import shift_helper

# Load environment variables from .env
load_dotenv()

router = APIRouter(prefix="/users", tags=["Users"])

# Initialize token manager
token_manager = TokenManager()

# Configuration from environment
ZOHO_DOMAIN = os.getenv("ZOHO_DOMAIN", "com")
SHEET_RESOURCE_ID = os.getenv("SHEET_RESOURCE_ID")
SHEET_NAME = os.getenv("SHEET_NAME")

field_mapping = {
    "id":"#",
    "name": "Employee Name",
    "empid": "Emp ID",
    "date": "Date",
    "actual_shift": "Hubble Timings",
    "worked_shift": "Shift Timings",
    "project": "Project Name",
    "reason": "Reason",
    "lead_approval": "Sandeep Lead Approval",
    "lead_remarks": "Lead Remarks",
    "hr_verification": "HR Verified Yes/No",
    "manager_approval": "Vamsi Nadenlda Approval",
    "manager_remarks": "Manager Comments if any",
    "hr_lead_comments": "Lead/HR comments"
}


async def update_zoho_sheet(request: UpdateSheetRequest):
    """
    Endpoint to update a Zoho Sheet.
    By default, it uses 'worksheet.records.add' to append new rows mapped to headers.
    """
    # 1. Ensure we have a valid access token
    try:
        access_token = token_manager.get_token()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # 2. Construct the Zoho Sheet API URL
    url = f"https://sheet.zoho.{ZOHO_DOMAIN}/api/v2/{SHEET_RESOURCE_ID}"
    
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}"
    }

    shift_record = {}
    for key, value in request.record.model_dump().items():
        zoho_field = field_mapping.get(key)
        if zoho_field:
            shift_record[zoho_field] = value
    
    # 3. Zoho Sheet v2 API expects URL-encoded form data, stringifying the JSON
    payload = {
        "method": "worksheet.records.add",
        "worksheet_name": SHEET_NAME,
        "header_row": "1",
        "json_data": json.dumps([shift_record]) # Zoho expects an array of records
    }

    print(f"Making request to Zoho Sheet API with payload: {url}")
    
    # 4. Make the request to Zoho
    response = requests.post(url, headers=headers, data=payload,verify=False)
    
    # 5. Handle and return the response
    if response.status_code == 200:
        return {"status": "success", "info": response.json()}
    else:
        raise HTTPException(
            status_code=response.status_code, 
            detail=f"Zoho API Error: {response.text}"
        )
    
async def get_zoho_sheet_data(request: GetSheetRequest):
    """
    Endpoint to fetch records from a Zoho Sheet.
    Returns data as a list of objects mapped to column headers.
    """
    # 1. Get a valid access token
    try:
        access_token = token_manager.get_token()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # 2. Construct the URL (Same base URL as update)
    url = f"https://sheet.zoho.{ZOHO_DOMAIN}/api/v2/{SHEET_RESOURCE_ID}"
    
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}"
    }
    
    # 3. Method for fetching is "worksheet.records.fetch"
    payload = {
        "method": "worksheet.records.fetch",
        "worksheet_name": SHEET_NAME,
        "header_row": str(request.header_row),
        "page": str(request.page),
        "per_page": str(request.per_page)
    }
    
    # 4. Make the request
    response = requests.get(url, headers=headers, params=payload,verify=False)
    
    if response.status_code == 200:
        data = response.json()
        records = data.get("records", [])
        shifts = [shift_helper(record) for record in records]

        # Zoho returns a "status": "success" and the data inside a "records" key
        # if data.get("status") == "success":
        #     return {
        #         "status": "success",
        #         "count": len(data.get("records", [])),
        #         "data": data.get("records", [])
        #     }
        # else:
        #     return data
        return {
                 "status": "success",
                 "count": len(data.get("records", [])),
                 "data": shifts
             }
    else:
        raise HTTPException(
            status_code=response.status_code, 
            detail=f"Zoho API Error: {response.text}"
        )