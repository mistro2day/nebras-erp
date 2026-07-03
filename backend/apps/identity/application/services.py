import re
from datetime import timedelta
from django.utils import timezone
from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.core.exceptions import ValidationError
from django.core.cache import cache
from apps.identity.domain.models import User, PasswordHistory
from apps.identity.domain.rbac import Role, Permission, UserRole, RolePermission
from apps.identity.domain.sessions import UserSession
from apps.identity.domain.user_assignment import UserAssignment
from apps.settings.domain.models import TenantSetting

class PasswordPolicyService:
    @staticmethod
    def validate_password_strength(password: str) -> None:
        if len(password) < 8:
            raise ValidationError("يجب أن تكون كلمة المرور مكونة من 8 أحرف على الأقل.")
        if not re.search(r"[A-Z]", password):
            raise ValidationError("يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل.")
        if not re.search(r"[a-z]", password):
            raise ValidationError("يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل.")
        if not re.search(r"\d", password):
            raise ValidationError("يجب أن تحتوي كلمة المرور على رقم واحد على الأقل.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            raise ValidationError("يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل.")

    @staticmethod
    def check_password_history(user: User, password: str) -> None:
        """
        التحقق من عدم تكرار آخر 5 كلمات مرور
        """
        histories = PasswordHistory.objects.filter(user=user).order_by('-created_at')[:5]
        for history in histories:
            if check_password(password, history.password_hash):
                raise ValidationError("لا يمكن استخدام كلمة مرور تم استخدامها مؤخراً.")

    @staticmethod
    def record_password_change(user: User, password_hash: str) -> None:
        PasswordHistory.objects.create(user=user, password_hash=password_hash)
        user.password_changed_at = timezone.now()
        # تعيين تاريخ انتهاء صلاحية كلمة المرور (على سبيل المثال 90 يوماً)
        user.password_expires_at = timezone.now() + timedelta(days=90)
        user.save(update_fields=['password_changed_at', 'password_expires_at'])


class IdentitySecurityService:
    MAX_FAILED_ATTEMPTS = 5
    LOCKOUT_DURATION_MINUTES = 15

    @classmethod
    def handle_failed_login(cls, user: User) -> None:
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= cls.MAX_FAILED_ATTEMPTS:
            user.lockout_until = timezone.now() + timedelta(minutes=cls.LOCKOUT_DURATION_MINUTES)
            user.status = 'locked'
        user.save(update_fields=['failed_login_attempts', 'lockout_until', 'status'])

    @classmethod
    def handle_successful_login(cls, user: User) -> None:
        if user.failed_login_attempts > 0 or user.status == 'locked':
            user.failed_login_attempts = 0
            user.lockout_until = None
            if user.status == 'locked':
                user.status = 'active'
            user.save(update_fields=['failed_login_attempts', 'lockout_until', 'status'])

    @classmethod
    def check_lockout(cls, user: User) -> bool:
        if user.status == 'locked' and user.lockout_until:
            if timezone.now() > user.lockout_until:
                # انتهاء مدة القفل تلقائياً
                user.status = 'active'
                user.failed_login_attempts = 0
                user.lockout_until = None
                user.save(update_fields=['status', 'failed_login_attempts', 'lockout_until'])
                return False
            return True
        return False


class PermissionCacheService:
    CACHE_TIMEOUT = 3600 # ساعة واحدة

    @classmethod
    def get_user_permissions(cls, user: User, tenant_id: str) -> set:
        if user.is_superuser:
            return {"*"}
        
        cache_key = f"user_perms_{user.id}_{tenant_id}"
        cached_perms = cache.get(cache_key)
        if cached_perms is not None:
            return set(cached_perms)

        # جلب الأدوار الفعالة والتحقق من عدم انتهاء الصلاحية
        now = timezone.now()
        user_roles = UserRole.objects.filter(
            user=user, 
            tenant_id=tenant_id
        ).filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now)
        )
        
        role_ids = [ur.role_id for ur in user_roles]
        
        # جلب الصلاحيات
        perms = Permission.objects.filter(roles__role_id__in=role_ids)
        perm_codes = {p.code for p in perms}
        
        cache.set(cache_key, list(perm_codes), cls.CACHE_TIMEOUT)
        return perm_codes

    @classmethod
    def clear_user_permissions_cache(cls, user_id: str, tenant_id: str) -> None:
        cache_key = f"user_perms_{user_id}_{tenant_id}"
        cache.delete(cache_key)