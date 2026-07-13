"""
اختبارات تهيئة الأدوار والصلاحيات النظامية وقنوات الاتصال.
"""
import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.identity.domain.rbac import (
    Role, Permission, RolePermission, ensure_system_roles,
)
from apps.identity.domain.rbac_catalog import (
    SYSTEM_ROLES, ALL_PERMISSION_CODES, resolve_role_permissions,
)
from apps.identity.application.services import PermissionCacheService
from apps.communications.application.provisioning import (
    ensure_communication_defaults, WELCOME_TEMPLATES,
)
from apps.communications.domain.models import (
    CommunicationChannel, CommunicationProvider, CommunicationTemplate,
)

User = get_user_model()


class EnsureSystemRolesTest(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()

    def test_creates_all_system_roles_with_permissions(self):
        roles = ensure_system_roles(self.tenant_id)
        self.assertEqual(set(roles.keys()), set(SYSTEM_ROLES.keys()))

        # الإداري يملك كل الصلاحيات
        admin_perms = set(
            RolePermission.objects.filter(role=roles['administrator'])
            .values_list('permission__code', flat=True)
        )
        self.assertEqual(admin_perms, set(ALL_PERMISSION_CODES))

        # المعلم يملك المجموعة المبسّطة فقط
        teacher_perms = set(
            RolePermission.objects.filter(role=roles['teacher'])
            .values_list('permission__code', flat=True)
        )
        self.assertEqual(teacher_perms, set(resolve_role_permissions('teacher')))
        self.assertNotIn('payroll:approve', teacher_perms)

    def test_idempotent(self):
        ensure_system_roles(self.tenant_id)
        ensure_system_roles(self.tenant_id)
        self.assertEqual(Role.objects.filter(tenant_id=self.tenant_id).count(), len(SYSTEM_ROLES))
        # لا تكرار في ربط صلاحيات الإداري
        admin = Role.objects.get(tenant_id=self.tenant_id, code='administrator')
        self.assertEqual(
            RolePermission.objects.filter(role=admin).count(), len(ALL_PERMISSION_CODES)
        )

    def test_user_permissions_resolve_via_cache_service(self):
        roles = ensure_system_roles(self.tenant_id)
        user = User.objects.create_user(email='t@school.edu', password='Password123!')
        from apps.identity.domain.rbac import UserRole
        UserRole.objects.create(tenant_id=self.tenant_id, user=user, role=roles['teacher'])
        PermissionCacheService.clear_user_permissions_cache(user.id, self.tenant_id)

        perms = PermissionCacheService.get_user_permissions(user, self.tenant_id)
        self.assertIn('grades:update', perms)
        self.assertNotIn('finance:read', perms)


class EnsureCommunicationDefaultsTest(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()

    def test_creates_channels_providers_templates(self):
        result = ensure_communication_defaults(self.tenant_id)
        self.assertEqual(set(result['channels']), {'email', 'whatsapp'})

        self.assertEqual(
            CommunicationChannel.objects.filter(tenant_id=self.tenant_id).count(), 2
        )
        # مزوّد محاكاة افتراضي لكل قناة
        self.assertEqual(
            CommunicationProvider.objects.filter(
                tenant_id=self.tenant_id, provider_type='mock', is_default=True
            ).count(), 2
        )
        # كل قوالب الترحيب مُنشأة
        self.assertEqual(
            CommunicationTemplate.objects.filter(tenant_id=self.tenant_id).count(),
            len(WELCOME_TEMPLATES),
        )

    def test_idempotent(self):
        ensure_communication_defaults(self.tenant_id)
        ensure_communication_defaults(self.tenant_id)
        self.assertEqual(
            CommunicationChannel.objects.filter(tenant_id=self.tenant_id).count(), 2
        )
        self.assertEqual(
            CommunicationTemplate.objects.filter(tenant_id=self.tenant_id).count(),
            len(WELCOME_TEMPLATES),
        )
