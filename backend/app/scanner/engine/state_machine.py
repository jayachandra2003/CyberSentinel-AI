"""
Scan State Machine — Enterprise Scan Engine (Phase 7).

Enforces legal state transitions across scan execution states:
NEW -> VALIDATING -> QUEUED -> RUNNING -> COMPLETED / FAILED / CANCELLED.
Terminal states (COMPLETED, FAILED, CANCELLED) block any subsequent transitions.
"""
from __future__ import annotations

import logging
from enum import Enum
from typing import Dict, Set

logger = logging.getLogger(__name__)


class ScanEngineState(str, Enum):
    """Scan execution state enum for Phase 7 Enterprise Engine."""

    NEW = "NEW"
    VALIDATING = "VALIDATING"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class InvalidStateTransitionError(Exception):
    """Raised when an illegal scan state transition is attempted."""

    def __init__(self, current_state: ScanEngineState, target_state: ScanEngineState) -> None:
        self.current_state = current_state
        self.target_state = target_state
        super().__init__(
            f"Invalid state transition from '{current_state.value}' to '{target_state.value}'"
        )


class ScanStateMachine:
    """
    State machine enforcing valid transitions and terminal state boundaries for scan jobs.
    """

    # Define legal next states per current state
    _ALLOWED_TRANSITIONS: Dict[ScanEngineState, Set[ScanEngineState]] = {
        ScanEngineState.NEW: {
            ScanEngineState.VALIDATING,
            ScanEngineState.CANCELLED,
            ScanEngineState.FAILED,
        },
        ScanEngineState.VALIDATING: {
            ScanEngineState.QUEUED,
            ScanEngineState.CANCELLED,
            ScanEngineState.FAILED,
        },
        ScanEngineState.QUEUED: {
            ScanEngineState.RUNNING,
            ScanEngineState.CANCELLED,
            ScanEngineState.FAILED,
        },
        ScanEngineState.RUNNING: {
            ScanEngineState.COMPLETED,
            ScanEngineState.CANCELLED,
            ScanEngineState.FAILED,
        },
        # Terminal states: no outbound transitions permitted
        ScanEngineState.COMPLETED: set(),
        ScanEngineState.FAILED: set(),
        ScanEngineState.CANCELLED: set(),
    }

    def __init__(self, initial_state: ScanEngineState = ScanEngineState.NEW) -> None:
        self._current_state = initial_state

    @property
    def current_state(self) -> ScanEngineState:
        return self._current_state

    def is_terminal(self) -> bool:
        """Return True if current state is a terminal state (COMPLETED, FAILED, CANCELLED)."""
        return self._current_state in {
            ScanEngineState.COMPLETED,
            ScanEngineState.FAILED,
            ScanEngineState.CANCELLED,
        }

    def can_transition_to(self, target_state: ScanEngineState) -> bool:
        """Check if transition to target_state is permitted from current_state."""
        allowed = self._ALLOWED_TRANSITIONS.get(self._current_state, set())
        return target_state in allowed

    def transition_to(self, target_state: ScanEngineState) -> ScanEngineState:
        """
        Transition state machine to target_state if legal.
        Raises InvalidStateTransitionError if transition is illegal.
        """
        if self._current_state == target_state:
            # Idempotent state transition call
            return self._current_state

        if not self.can_transition_to(target_state):
            logger.error(
                f"Illegal scan state transition attempt: {self._current_state.value} -> {target_state.value}"
            )
            raise InvalidStateTransitionError(self._current_state, target_state)

        logger.info(f"Scan state transition: {self._current_state.value} -> {target_state.value}")
        self._current_state = target_state
        return self._current_state
