"""
Progress Calculator — Enterprise Scan Engine (Phase 7).

Computes dynamic progress percentages based on (completed_modules / enabled_modules).
Scales automatically as new scanner modules are registered without hardcoded constants.
"""
from __future__ import annotations

import logging
from typing import List, Union

from app.scanner.interfaces.module_interface import IScannerModule

logger = logging.getLogger(__name__)


class ProgressCalculator:
    """
    Computes dynamic progress percentages for scan execution.
    """

    @staticmethod
    def calculate_progress(
        completed_count: int,
        enabled_modules: Union[int, List[IScannerModule], List[str]],
    ) -> int:
        """
        Calculate integer progress percentage (0-100).

        :param completed_count: Number of scanner modules that have finished execution.
        :param enabled_modules: Integer count or list of enabled modules for the scan.
        :return: Integer progress percentage between 0 and 100.
        """
        if isinstance(enabled_modules, list):
            total_enabled = len(enabled_modules)
        else:
            total_enabled = int(enabled_modules)

        if total_enabled <= 0:
            return 100

        if completed_count <= 0:
            return 0

        if completed_count >= total_enabled:
            return 100

        progress = int(round((completed_count / total_enabled) * 100))
        return max(0, min(100, progress))
