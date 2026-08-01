from abc import ABC, abstractmethod
from typing import Any, Dict


class IScanEngine(ABC):
    """Abstract Interface for Defensive Scan Execution Engines."""

    @abstractmethod
    async def initialize(self, config: Dict[str, Any]) -> None:
        """Initialize engine parameters."""
        pass

    @abstractmethod
    async def execute_scan(self, target_url: str) -> Dict[str, Any]:
        """Execute defensive security evaluation pipeline contract."""
        pass

    @abstractmethod
    async def terminate(self) -> None:
        """Gracefully terminate scan processes."""
        pass
