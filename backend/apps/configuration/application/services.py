import uuid
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.configuration.domain.models import (
    FeatureFlag, FeatureTarget, SystemSetting, ModuleRegistry
)

class FeatureFlagService:
    @staticmethod
    def is_feature_enabled(tenant_id, feature_code, user_id=None, role_ids=None):
        """
        التحقق الفوري من تفعيل ميزة معينة (Feature Flag) للمستأجر الحالي والمستخدم الحالي.
        """
        try:
            feature = FeatureFlag.objects.get(tenant_id=tenant_id, code=feature_code)
        except FeatureFlag.DoesNotExist:
            return False

        # التحقق من التوقيت والجدولة
        now = timezone.now()
        if feature.scheduled_activation and feature.scheduled_activation > now:
            return False
        if feature.scheduled_deactivation and feature.scheduled_deactivation < now:
            return False

        # إذا كانت الميزة معطلة عامة
        if not feature.is_enabled:
            return False

        # التحقق من القيود الموجهة للمستخدِمين أو الأدوار (Targeting)
        targets = FeatureTarget.objects.filter(tenant_id=tenant_id, feature=feature)
        if not targets.exists():
            return True # ميزة عامة نشطة للجميع

        # فحص استهداف المستخدم
        if user_id and targets.filter(target_type='user', target_id=str(user_id)).exists():
            return True

        # فحص استهداف الأدوار
        if role_ids:
            role_str_ids = [str(r) for r in role_ids]
            if targets.filter(target_type='role', target_id__in=role_str_ids).exists():
                return True

        return False


class SystemConfigurationService:
    @staticmethod
    def get_setting_value(tenant_id, key, default=None):
        """
        استرجاع القيمة الفعالة لإعداد معين من الـ Cache أو قاعدة البيانات.
        """
        try:
            setting = SystemSetting.objects.get(tenant_id=tenant_id, key=key)
            return setting.value
        except SystemSetting.DoesNotExist:
            return default

    @staticmethod
    def update_setting(tenant_id, key, value, user_id=None):
        """
        تحديث إعداد معين وتسجيل العملية في سجل التدقيق المالي والإداري.
        """
        setting, created = SystemSetting.objects.get_or_create(
            tenant_id=tenant_id,
            key=key,
            defaults={"value": value}
        )
        if not created:
            setting.value = value
            setting.save()

        # توليد إحداثيات تدقيق الأداء
        from apps.configuration.domain.models import ConfigurationAudit
        ConfigurationAudit.objects.create(
            tenant_id=tenant_id,
            user_id=user_id,
            action="update_setting",
            details=f"Updated key {key} to {value}"
        )
        return setting
