from abc import ABC, abstractmethod
from typing import Any, Dict, List


class IResultAnalyzer(ABC):
    """Abstract Interface for Normalizing Raw Evaluation Results."""

    @abstractmethod
    def normalize_findings(self, raw_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Normalize raw findings into standard Vulnerability schemas."""
        pass
