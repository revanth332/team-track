# Pydantic model for request validation
from typing import Any, Dict, List, Optional

from pydantic.v1 import BaseModel


class UpdateSheetRequest(BaseModel):
    resource_id: str
    worksheet_name: str
    method: str = "worksheet.records.add" # Default to appending rows
    header_row: Optional[int] = 1
    json_data: List[Dict[str, Any]] # Takes a list of dictionaries