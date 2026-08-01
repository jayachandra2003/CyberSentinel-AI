from enum import Enum
from typing import List, Set


class RoleEnum(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    ANALYST = "ANALYST"
    AUDITOR = "AUDITOR"
    USER = "USER"


class PermissionEnum(str, Enum):
    MANAGE_USERS = "manage_users"
    MANAGE_SYSTEM = "manage_system"
    VERIFY_TARGETS = "verify_targets"
    RUN_SCANS = "run_scans"
    VIEW_SCANS = "view_scans"
    VIEW_VULNERABILITIES = "view_vulnerabilities"
    GENERATE_REPORTS = "generate_reports"
    VIEW_AUDIT_LOGS = "view_audit_logs"


ROLE_PERMISSIONS: dict[RoleEnum, Set[PermissionEnum]] = {
    RoleEnum.SUPER_ADMIN: set(PermissionEnum),
    RoleEnum.ADMIN: {
        PermissionEnum.MANAGE_USERS,
        PermissionEnum.VERIFY_TARGETS,
        PermissionEnum.RUN_SCANS,
        PermissionEnum.VIEW_SCANS,
        PermissionEnum.VIEW_VULNERABILITIES,
        PermissionEnum.GENERATE_REPORTS,
        PermissionEnum.VIEW_AUDIT_LOGS,
    },
    RoleEnum.ANALYST: {
        PermissionEnum.RUN_SCANS,
        PermissionEnum.VIEW_SCANS,
        PermissionEnum.VIEW_VULNERABILITIES,
        PermissionEnum.GENERATE_REPORTS,
    },
    RoleEnum.AUDITOR: {
        PermissionEnum.VIEW_SCANS,
        PermissionEnum.VIEW_VULNERABILITIES,
        PermissionEnum.GENERATE_REPORTS,
        PermissionEnum.VIEW_AUDIT_LOGS,
    },
    RoleEnum.USER: {
        PermissionEnum.VERIFY_TARGETS,
        PermissionEnum.RUN_SCANS,
        PermissionEnum.VIEW_SCANS,
        PermissionEnum.VIEW_VULNERABILITIES,
        PermissionEnum.GENERATE_REPORTS,
    },
}


def has_permission(role: RoleEnum, permission: PermissionEnum) -> bool:
    """Checks whether a role possesses a given permission."""
    return permission in ROLE_PERMISSIONS.get(role, set())
