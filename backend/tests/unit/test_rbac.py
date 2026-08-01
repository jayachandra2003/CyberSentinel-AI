from app.core.rbac import RoleEnum, PermissionEnum, has_permission


def test_rbac_permissions():
    assert has_permission(RoleEnum.SUPER_ADMIN, PermissionEnum.MANAGE_SYSTEM) is True
    assert has_permission(RoleEnum.USER, PermissionEnum.MANAGE_SYSTEM) is False
    assert has_permission(RoleEnum.ANALYST, PermissionEnum.RUN_SCANS) is True
