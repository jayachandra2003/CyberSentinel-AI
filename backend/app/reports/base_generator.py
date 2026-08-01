from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseReportGenerator(ABC):
    """Abstract Report Generator Interface."""

    @abstractmethod
    async def generate_pdf(self, scan_data: Dict[str, Any]) -> str:
        pass
