import json
import os
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv
from fastapi import HTTPException

from app.core.token_manager import TokenManager


load_dotenv()


class ZohoSheetManager:
    def __init__(
        self,
        token_manager: Optional[TokenManager] = None,
        domain: Optional[str] = None,
        resource_id: Optional[str] = None,
        worksheet_name: Optional[str] = None,
    ):
        self.token_manager = token_manager or TokenManager()
        self.domain = domain or os.getenv("ZOHO_DOMAIN", "com")
        self.resource_id = resource_id or os.getenv("SHEET_RESOURCE_ID")
        self.worksheet_name = worksheet_name or os.getenv("SHEET_NAME")

    @property
    def url(self) -> str:
        if not self.resource_id:
            raise HTTPException(status_code=500, detail="SHEET_RESOURCE_ID is not configured")
        return f"https://sheet.zoho.{self.domain}/api/v2/{self.resource_id}"

    def _headers(self, content_type: Optional[str] = None) -> Dict[str, str]:
        try:
            access_token = self.token_manager.get_zoho_token()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

        headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
        if content_type:
            headers["Content-type"] = content_type
        return headers

    def _base_payload(self, method: str) -> Dict[str, Any]:
        if not self.worksheet_name:
            raise HTTPException(status_code=500, detail="SHEET_NAME is not configured")
        return {
            "method": method,
            "worksheet_name": self.worksheet_name,
        }

    def _request(
        self,
        http_method: str,
        payload: Dict[str, Any],
        *,
        content_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        response = requests.request(
            http_method,
            self.url,
            headers=self._headers(content_type),
            params=payload if http_method.upper() == "GET" else None,
            data=payload if http_method.upper() != "GET" else None,
            verify=False,
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Zoho API Error: {response.text}",
            )

        return response.json()

    def fetch_records(
        self,
        *,
        header_row: int = 1,
        criteria: Optional[str] = None,
        page: Optional[int] = None,
        per_page: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        payload = self._base_payload("worksheet.records.fetch")
        payload["header_row"] = str(header_row)
        if criteria:
            payload["criteria"] = criteria
        if page:
            payload["page"] = str(page)
        if per_page:
            payload["per_page"] = str(per_page)

        data = self._request("GET", payload)
        return data.get("records", [])

    def add_records(self, records: List[Dict[str, Any]], *, header_row: int = 1) -> Dict[str, Any]:
        payload = self._base_payload("worksheet.records.add")
        payload["header_row"] = str(header_row)
        payload["json_data"] = json.dumps(records)
        return self._request("POST", payload)

    def update_records(
        self,
        data: Dict[str, Any],
        *,
        criteria: str,
        header_row: int = 1,
        first_match_only: bool = True,
    ) -> Dict[str, Any]:
        payload = self._base_payload("worksheet.records.update")
        payload["header_row"] = str(header_row)
        payload["criteria"] = criteria
        payload["first_match_only"] = first_match_only
        payload["data"] = json.dumps(data)
        return self._request("POST", payload)

    def delete_records(
        self,
        *,
        criteria: str,
        delete_rows: bool = True,
        first_match_only: bool = True,
    ) -> Dict[str, Any]:
        payload = self._base_payload("worksheet.records.delete")
        payload["criteria"] = criteria
        payload["delete_rows"] = delete_rows
        payload["first_match_only"] = first_match_only
        return self._request(
            "POST",
            payload,
            content_type="application/x-www-form-urlencoded",
        )
