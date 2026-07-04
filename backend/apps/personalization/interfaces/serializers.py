from rest_framework import serializers
from apps.personalization.domain.models import (
    AccessibilityProfile, UserPreference, Theme, Workspace
)

class AccessibilityProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessibilityProfile
        fields = ['id', 'user_id', 'font_scale', 'high_contrast', 'reduced_motion', 'focus_indicators']


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = ['id', 'user_id', 'default_branch_id', 'default_academic_year_id', 'default_term_id', 'landing_dashboard']


class ThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Theme
        fields = ['id', 'name', 'code', 'branding_config']


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ['id', 'name_ar', 'name_en', 'code', 'is_template']
