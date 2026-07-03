from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from apps.identity.domain.rbac import Role, Permission, RolePermission, UserRole
from apps.identity.domain.models import PasswordHistory
from apps.identity.domain.sessions import UserSession
from apps.identity.application.services import (
    PasswordPolicyService, IdentitySecurityService, PermissionCacheService
)
from apps.identity.authorization import HasPermission
import uuid

User = get_user_model()

class IAMModuleComprehensiveTest(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.user = User.objects.create_user(
            email='test_user@school.edu',
            password='Password123!',
            first_name='Mano',
            last_name='User'
        )
        self.role = Role.objects.create(
            tenant_id=self.tenant_id,
            name='Academic Registry',
            code='academic_registry'
        )
        self.permission = Permission.objects.create(
            name='View Grades',
            code='academics:grades:view',
            type='api',
            module='academics',
            resource='grades',
            action='read'
        )
        RolePermission.objects.create(
            role=self.role,
            permission=self.permission
        )
        UserRole.objects.create(
            tenant_id=self.tenant_id,
            user=self.user,
            role=self.role
        )

    def test_permission_guard_allows_access(self):
        """التحقق من أن حارس الصلاحيات يؤكد امتلاك المستخدم الصلاحية بنجاح"""
        class DummyRequest:
            user = self.user
            tenant = type('DummyTenant', (), {'id': self.tenant_id})()

        request = DummyRequest()
        guard = HasPermission('academics:grades:view')
        self.assertTrue(guard.has_permission(request, None))

    def test_password_strength_validation(self):
        """التحقق من صحة وقوة كلمة المرور"""
        with self.assertRaises(Exception):
            PasswordPolicyService.validate_password_strength('123')
        
        # كلمة مرور قوية مقبولة
        try:
            PasswordPolicyService.validate_password_strength('StrongPass123!')
        except Exception:
            self.fail("يجب أن تقبل كلمة المرور القوية.")

    def test_failed_login_lockout(self):
        """التحقق من قفل الحساب بعد محاولات فاشلة متكررة"""
        self.assertEqual(self.user.failed_login_attempts, 0)
        
        # محاكاة 5 محاولات فاشلة
        for _ in range(5):
            IdentitySecurityService.handle_failed_login(self.user)
            
        self.user.refresh_from_db()
        self.assertEqual(self.user.status, 'locked')
        self.assertTrue(IdentitySecurityService.check_lockout(self.user))

    def test_session_creation(self):
        """التحقق من إنشاء جلسة المستخدم وتخزين معلومات الجهاز"""
        session = UserSession.objects.create(
            user=self.user,
            tenant_id=self.tenant_id,
            device_id='device_01',
            device_name='Chrome Browser',
            browser='Chrome',
            operating_system='Windows 11',
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0'
        )
        self.assertEqual(session.device_id, 'device_01')
        self.assertTrue(session.is_active)