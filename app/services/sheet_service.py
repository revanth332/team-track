
import os
import json
from fastapi import APIRouter, HTTPException
from app.core.token_manager import TokenManager
from app.schemas.sheet import CreateSheetRequest, UpdateSheetRequest, GetSheetRequest
from dotenv import load_dotenv
import requests
from app.services.shift_service import shift_helper
from datetime import datetime

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
    "name": "Employee Name",
    "empid": "Emp ID",
    "date": "Date",
    "actual_shift": "Hubble Shift Timings",
    "worked_shift": "Worked Shift Timings",
    "project": "Project Name",
    "reason": "Reason",
    "lead_approval": "Sandeep Lead Approval",
    "lead_remarks": "Lead Remarks",
    "hr_verification": "HR Verified Yes/No",
    "manager_approval": "Vamsi Nadenlda Approval",
    "manager_remarks": "Manager Comments if any",
    "hr_lead_comments": "Lead/HR comments"
}


# async def add_row_zoho_sheet(request: CreateSheetRequest):
#     """
#     Endpoint to update a Zoho Sheet.
#     By default, it uses 'worksheet.records.add' to append new rows mapped to headers.
#     """
#     # 1. Ensure we have a valid access token
#     try:
#         access_token = token_manager.get_zoho_token()
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
        
#     # 2. Construct the Zoho Sheet API URL
#     url = f"https://sheet.zoho.{ZOHO_DOMAIN}/api/v2/{SHEET_RESOURCE_ID}"
    
#     headers = {
#         "Authorization": f"Zoho-oauthtoken {access_token}"
#     }

#     shift_record = {}
#     for key, value in request.record.model_dump().items():
#         zoho_field = field_mapping.get(key)
#         if zoho_field:
#             shift_record[zoho_field] = value
    
#     # 3. Zoho Sheet v2 API expects URL-encoded form data, stringifying the JSON
#     payload = {
#         "method": "worksheet.records.add",
#         "worksheet_name": SHEET_NAME,
#         "header_row": "1",
#         "json_data": json.dumps([shift_record]) # Zoho expects an array of records
#     }

    
#     # 4. Make the request to Zoho
#     response = requests.post(url, headers=headers, data=payload,verify=False)
    
#     # 5. Handle and return the response
#     if response.status_code == 200:
#         return {"status": "success", "info": response.json()}
#     else:
#         raise HTTPException(
#             status_code=response.status_code, 
#             detail=f"Zoho API Error: {response.text}"
#         )
    
async def add_row_zoho_sheet(request: CreateSheetRequest):

    try:
        access_token = token_manager.get_zoho_token()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    url = f"https://sheet.zoho.{ZOHO_DOMAIN}/api/v2/{SHEET_RESOURCE_ID}"

    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}"
    }

    shift_record = {}
    for key, value in request.record.model_dump().items():
        zoho_field = field_mapping.get(key)
        if zoho_field:
            shift_record[zoho_field] = value

    emp_id = shift_record.get("Emp ID")
    date = shift_record.get("Date")
    raw_date = datetime.strptime(date, "%d/%m/%Y")
    valid_date = datetime.strftime(raw_date, "%Y-%m-%d")

    # ------------------------------------
    # DUPLICATE CHECK
    # ------------------------------------
    fetch_payload = {
        "method": "worksheet.records.fetch",
        "worksheet_name": SHEET_NAME,
        "header_row": "1",
        "criteria": f'("Date" = "{valid_date}")'
    }

    fetch_response = requests.get(
        url,
        headers=headers,
        params=fetch_payload,
        verify=False
    )
    if fetch_response.status_code != 200:
        raise HTTPException(status_code=500, detail=fetch_response.text)

    fetch_data = fetch_response.json()
    if fetch_data.get("records"):
        for row in fetch_data["records"]:
            if str(row.get("Emp ID")) == str(emp_id):
                raise HTTPException(
                    status_code=400,
                    detail=f"Duplicate record exists for Emp ID {emp_id} on {date}"
                )

    # ------------------------------------
    # GET EXISTING RECORDS TO FIND MAX ID
    # ------------------------------------
    id_fetch_payload = {
        "method": "worksheet.records.fetch",
        "worksheet_name": SHEET_NAME
    }

    id_response = requests.get(url, headers=headers, params=id_fetch_payload, verify=False)

    if id_response.status_code != 200:
        raise HTTPException(status_code=500, detail=id_response.text)

    rows = id_response.json().get("records", [])

    # ------------------------------------
    # COMPUTE NEXT ID
    # ------------------------------------
    max_id = 0

    for row in rows:
        try:
            row_id = int(row.get("#", 0))
            if row_id > max_id:
                max_id = row_id
        except:
            pass

    next_id = max_id + 1

    shift_record["#"] = next_id

    # ------------------------------------
    # INSERT RECORD
    # ------------------------------------
    payload = {
        "method": "worksheet.records.add",
        "worksheet_name": SHEET_NAME,
        "header_row": "1",
        "json_data": json.dumps([shift_record])
    }

    response = requests.post(url, headers=headers, data=payload, verify=False)

    if response.status_code == 200:
        return {"status": "success", "info": response.json()}

    raise HTTPException(status_code=response.status_code, detail=response.text)

async def get_zoho_sheet_data(request: GetSheetRequest):
    """
    Endpoint to fetch records from a Zoho Sheet.
    Returns data as a list of objects mapped to column headers.
    """
    # 1. Get a valid access token
    try:
        access_token = token_manager.get_zoho_token()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # 2. Construct the URL (Same base URL as update)
    url = f"https://sheet.zoho.{ZOHO_DOMAIN}/api/v2/{SHEET_RESOURCE_ID}"
    
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}"
    }

    criteria_str = ""
    if request.date:
        criteria_str += f'("Date" = "{request.date}")'
    if request.name:
        if criteria_str:
            criteria_str += " and "
        criteria_str += f'("Employee Name" = "{request.name}")'
    
    # 3. Method for fetching is "worksheet.records.fetch"
    payload = {
        "method": "worksheet.records.fetch",
        "worksheet_name": SHEET_NAME,
        "header_row": str(request.header_row),
        "page": str(request.page),
        "criteria": criteria_str,
        "per_page": str(request.per_page)
    }
    
    # 4. Make the request
    response = requests.get(url, headers=headers, params=payload,verify=False)
    
    if response.status_code == 200:
        data = response.json()
        records = data.get("records", [])
        valid_records = [r for r in records if r.get("Emp ID") and r.get("Date")]
        shifts = [shift_helper(record) for record in valid_records]

        if request.year or request.month:
            filtered_records =[]
            
            for row in shifts:
                # Get the date string from the row. 
                # (Make sure "Date" matches your exact column header case)
                date_str = row.get("date") 
                print(date_str,"Before") 
                if not date_str:
                    continue # Skip rows with empty dates
                    
                try:
                    # Parse the date string into a Python datetime object
                    # NOTE: Change "%d-%m-%Y" to match how dates look in your sheet!
                    # Examples: 
                    # "25/12/2026" -> "%d/%m/%Y"
                    # "2026-12-25" -> "%Y-%m-%d"
                    row_date = datetime.strptime(date_str, "%d/%m/%Y")
                    
                    # Check Year condition
                    match_year = (row_date.year == request.year) if request.year else True
                    
                    # Check Month condition
                    match_month = (row_date.month == request.month) if request.month else True
                    
                    # If both match, keep the row
                    if match_year and match_month:
                        filtered_records.append(row)
                        
                except ValueError:
                    # If a date fails to parse, just skip it or log it
                    print(f"Warning: Could not parse date format for: {date_str}")
                    continue
            
            # Replace records with our fully filtered list
            shifts = filtered_records

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
    
async def update_row_zoho_sheet(request: UpdateSheetRequest, emp_id: str, date: str):
    """
    Updates a specific row index (e.g., row 5) with new_data.
    """
    access_token = token_manager.get_zoho_token()
    url = f"https://sheet.zoho.{ZOHO_DOMAIN}/api/v2/{SHEET_RESOURCE_ID}"
    
    headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}

    shift_record = {}
    for key, value in request.record.model_dump().items():
        zoho_field = field_mapping.get(key)
        if zoho_field:
            shift_record[zoho_field] = value
    
    criteria_str = f'("Emp ID" = "{emp_id}" and "Date" = "{date}")'

    payload = {
        "method": "worksheet.records.update",
        "worksheet_name": SHEET_NAME,
        "header_row":str(request.header_row),
        "criteria": criteria_str,
        "data": json.dumps(shift_record)
    }

    print(payload,"# Debugging output to verify update payload") # Debugging output to verify update payload
    response = requests.post(url, headers=headers, data=payload)
    
    return response.json()

async def delete_row_zoho_sheet(name: str, date: str,is_admin: bool):
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can delete records")

    access_token = token_manager.get_zoho_token()

    url = f"https://sheet.zoho.{ZOHO_DOMAIN}/api/v2/{SHEET_RESOURCE_ID}"

    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}"
    }

    criteria_str = f'("Employee Name" = "{name}" and "Date" = "{date}")'

    # Step 1 — Fetch matching records
    fetch_payload = {
        "method": "worksheet.records.fetch",
        "worksheet_name": SHEET_NAME,
        "criteria": criteria_str
    }

    fetch_response = requests.get(url, headers=headers, params=fetch_payload,verify=False)
    if fetch_response.status_code != 200:
        raise HTTPException(status_code=500, detail=fetch_response.text)
    fetch_data = fetch_response.json()

    records = fetch_data.get("records", [])

    if not records:
        raise Exception("No record found to delete")

    if len(records) > 1:
        raise Exception("Multiple records found. Delete aborted for safety")


    # Step 2 — Delete using row_id
    delete_payload = {
        "method": "worksheet.records.delete",
        "worksheet_name": SHEET_NAME,
        "criteria": criteria_str
    }

    delete_response = requests.post(url, headers=headers, data=delete_payload,verify=False)

    return delete_response.json()