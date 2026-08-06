"""
Scanner Module Registry — Enterprise Scan Engine (Phase 7).

Manages dynamic discovery, registration, profile filtering, and execution of scanner modules.
Pluggable architecture allowing future scanner modules to register without modifying core engine logic.
"""
from __future__ import annotations

import logging
from typing import Dict, List, Optional

from app.scanner.interfaces.module_interface import IScannerModule
from app.scanner.modules.cookies import CookieScanner
from app.scanner.modules.dns import DNSScanner
from app.scanner.modules.headers import HeadersScanner
from app.scanner.modules.ssl import SSLScanner
from app.scanner.modules.tech import TechScanner
from app.scanner.modules.whois import WHOISScanner

logger = logging.getLogger(__name__)


class ScannerModuleRegistry:
    """
    Central registry for discovering, registering, and retrieving IScannerModule instances.
    """

    def __init__(self, register_defaults: bool = True) -> None:
        self._modules: Dict[str, IScannerModule] = {}
        self._module_profiles: Dict[str, List[str]] = {
            "Standard Scan": ["dns", "whois", "ssl", "headers", "cookies", "tech"],
            "Quick Scan": ["dns", "headers", "tech"],
            "Compliance Scan": ["ssl", "headers", "cookies"],
            "Full Scan": ["dns", "whois", "ssl", "headers", "cookies", "tech"],
        }

        if register_defaults:
            self._register_default_modules()

    def _register_default_modules(self) -> None:
        """Register default 6 baseline passive scanner modules."""
        defaults = [
            DNSScanner(),
            WHOISScanner(),
            SSLScanner(),
            HeadersScanner(),
            CookieScanner(),
            TechScanner(),
        ]
        for module in defaults:
            self.register(module)

    def register(self, module: IScannerModule) -> None:
        """Register a scanner module instance."""
        module_id = module.module_id.lower()
        self._modules[module_id] = module
        logger.info(f"Registered scanner module: '{module_id}' ({module.__class__.__name__})")

    def unregister(self, module_id: str) -> bool:
        """Unregister a scanner module by ID."""
        module_id = module_id.lower()
        if module_id in self._modules:
            del self._modules[module_id]
            return True
        return False

    def get_module(self, module_id: str) -> Optional[IScannerModule]:
        """Retrieve a specific registered module by ID."""
        return self._modules.get(module_id.lower())

    def get_enabled_modules(self) -> List[IScannerModule]:
        """Return list of all currently registered and active module instances."""
        return list(self._modules.values())

    def get_modules_by_profile(self, profile_name: str = "Standard Scan") -> List[IScannerModule]:
        """
        Retrieve enabled modules matching a scan profile.
        Defaults to returning all registered modules if profile is unknown or 'Custom Scan'.
        """
        profile_modules = self._module_profiles.get(profile_name)
        if not profile_modules:
            return self.get_enabled_modules()

        enabled: List[IScannerModule] = []
        for mod_id in profile_modules:
            mod = self.get_module(mod_id)
            if mod:
                enabled.append(mod)
        return enabled

    def list_module_ids(self) -> List[str]:
        """Return list of all registered module IDs."""
        return list(self._modules.keys())
