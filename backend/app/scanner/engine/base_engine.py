from typing import Any, Dict
from app.scanner.interfaces.engine_interface import IScanEngine


class BaseScanEngine(IScanEngine):
    """Base class for defensive scan engine implementation."""

    async def initialize(self, config: Dict[str, Any]) -> None:
        self.config = config

    async def execute_scan(self, target_url: str) -> Dict[str, Any]:
        return {
            "target": target_url,
            "status": "COMPLETED_CONTRACT",
            "findings": [],
        }

    async def terminate(self) -> None:
        pass
