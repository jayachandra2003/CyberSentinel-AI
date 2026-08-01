from typing import Any, Dict, List
from app.scanner.interfaces.analyzer_interface import IResultAnalyzer


class BaseResultAnalyzer(IResultAnalyzer):
    """Base analyzer implementation contract."""

    def normalize_findings(self, raw_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        return []
