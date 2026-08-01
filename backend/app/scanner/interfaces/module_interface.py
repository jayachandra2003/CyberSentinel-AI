from abc import ABC, abstractmethod
from typing import Any, Dict


class IScannerModule(ABC):
    """Strategy Pattern Base Interface for Scanner Modules."""

    @property
    @abstractmethod
    def module_id(self) -> str:
        """Unique identifier for module (e.g. 'ssl', 'headers', 'dns')."""
        pass

    @abstractmethod
    async def run(self, target: str) -> Dict[str, Any]:
        """Execute defensive analysis against target domain."""
        pass


# Alias for backward compatibility if needed
IScanModule = IScannerModule
