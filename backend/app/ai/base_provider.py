from abc import ABC, abstractmethod


class BaseAIProvider(ABC):
    """Abstract interface for defensive AI insights provider."""

    @abstractmethod
    async def summarize_security_posture(self, summary_data: str) -> str:
        pass
