
import os
import json
from fastapi import APIRouter, HTTPException, requests
from app.core.token_manager import TokenManager
from app.schemas.sheet import UpdateSheetRequest
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

router = APIRouter(prefix="/users", tags=["Users"])

# Initialize token manager
token_manager = TokenManager()

# Configuration from environment
ZOHO_DOMAIN = os.getenv("ZOHO_DOMAIN", "com")

@router.post("/update-sheet")
def update_zoho_sheet(request: UpdateSheetRequest):
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
    url = f"https://sheet.zoho.{ZOHO_DOMAIN}/api/v2/{request.resource_id}"
    
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}"
    }
    
    # 3. Zoho Sheet v2 API expects URL-encoded form data, stringifying the JSON
    payload = {
        "method": request.method,
        "worksheet_name": request.worksheet_name,
        "header_row": request.header_row,
        "json_data": json.dumps(request.json_data)
    }

    print(f"Making request to Zoho Sheet API with payload: {url}")
    
    # 4. Make the request to Zoho
    response = requests.post(url, headers=headers, data=payload,verify=False)
    
    # 5. Handle and return the response
    if response.status_code == 200:
        return {"status": "success", "zoho_response": response.json()}
    else:
        raise HTTPException(
            status_code=response.status_code, 
            detail=f"Zoho API Error: {response.text}"
        )