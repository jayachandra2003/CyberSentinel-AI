from typing import Dict, List, Optional
from app.scanner.interfaces.module_interface import IScanModule, IScannerModule
from app.scanner.registry.scanner_module_registry import ScannerModuleRegistry


class ModuleRegistry:
    """Registry pattern implementation for discovering defensive scanner modules (legacy wrapper)."""

    _instance: Optional[ScannerModuleRegistry] = None

    @classmethod
    def get_instance(cls) -> ScannerModuleRegistry:
        if cls._instance is None:
            cls._instance = ScannerModuleRegistry(register_defaults=True)
        return cls._instance

    @classmethod
    def register(cls, module: IScanModule) -> None:
        cls.get_instance().register(module)

    @classmethod
    def get_module(cls, module_id: str) -> IScanModule | None:
        return cls.get_instance().get_module(module_id)

