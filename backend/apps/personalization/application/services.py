import uuid
from django.core.exceptions import ValidationError
from apps.personalization.domain.models import (
    AccessibilityProfile, UserPreference, ThemeProfile, LanguagePreference,
    Workspace, WorkspaceLayout
)

class AccessibilityService:
    @staticmethod
    def get_accessibility_profile(tenant_id, user_id):
        """
        جلب إعدادات الوصول الميسر للمستخدِم الحالي، أو إنشاء سجل افتراضي إذا لم يكن موجوداً.
        """
        profile, created = AccessibilityProfile.objects.get_or_create(
            tenant_id=tenant_id,
            user_id=user_id,
            defaults={
                "font_scale": 1.0,
                "high_contrast": False,
                "reduced_motion": False,
                "focus_indicators": True
            }
        )
        return profile

    @staticmethod
    def update_accessibility_profile(tenant_id, user_id, font_scale, high_contrast, reduced_motion):
        """
        تحديث وتأكيد إعدادات الوصول الميسر للمستخدِم (التي لها الأولوية المعمارية القصوى).
        """
        profile = AccessibilityService.get_accessibility_profile(tenant_id, user_id)
        profile.font_scale = font_scale
        profile.high_contrast = high_contrast
        profile.reduced_motion = reduced_motion
        profile.save()
        return profile


class PreferenceService:
    @staticmethod
    def get_user_preferences(tenant_id, user_id):
        """
        جلب وتعبئة إعدادات اللغات والتوطين والفرع الأكاديمي الافتراضي.
        """
        preference, created = UserPreference.objects.get_or_create(
            tenant_id=tenant_id,
            user_id=user_id,
            defaults={
                "landing_dashboard": "/dashboard"
            }
        )
        lang, lang_created = LanguagePreference.objects.get_or_create(
            tenant_id=tenant_id,
            user_id=user_id,
            defaults={"language_code": "ar"}
        )
        return {
            "default_branch_id": preference.default_branch_id,
            "default_academic_year_id": preference.default_academic_year_id,
            "landing_dashboard": preference.landing_dashboard,
            "language_code": lang.language_code
        }
