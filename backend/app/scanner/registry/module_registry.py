from typing import Dict
from app.scanner.interfaces.module_interface import IScanModule


class ModuleRegistry:
    """Registry pattern implementation for discovering defensive scanner modules."""

    _registry: Dict[str, IScanModule] = {}

    @classmethod
    def register(cls, module: IScanModule) -> None:
        cls._registry[module.module_id] = module

    @classmethod
    def get_module(cls, module_id: str) -> IScanModule | None:
        return cls._registry.get(module_id)
