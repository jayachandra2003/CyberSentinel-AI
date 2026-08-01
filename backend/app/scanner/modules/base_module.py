from typing import Any, Dict
from app.scanner.interfaces.module_interface import IScanModule


class BaseScanModule(IScanModule):
    """Abstract base class for all defensive scan modules."""

    @property
    def module_id(self) -> str:
        return "base_module"

    @property
    def name(self) -> str:
        return "Base Defensive Module"

    async def validate_target(self, target_url: str) -> bool:
        return True

    async def run(self, target_url: str, context: Dict[str, Any]) -> Dict[str, Any]:
        return {"module_id": self.module_id, "status": "CONTRACT_CHECK_PASSED"}
