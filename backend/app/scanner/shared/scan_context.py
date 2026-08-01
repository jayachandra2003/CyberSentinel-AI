from typing import Any, Dict, Optional
from pydantic import BaseModel, HttpUrl


class ScanContext(BaseModel):
    """Context container passed through defensive scanner modules."""
    scan_id: int
    user_id: int
    target_url: HttpUrl
    authorization_token: str
    metadata: Dict[str, Any] = {}
