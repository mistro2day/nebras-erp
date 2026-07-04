from rest_framework import serializers
from apps.portal.domain.models import (
    PortalUser, PortalProfile, ParentProfile, StudentProfile, ApplicantProfile,
    PortalNotification, PortalAnnouncement, PortalMessage, PortalTask,
    PortalPreference, PortalTheme, PortalSettings
)

class PortalPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalPreference
        fields = ['id', 'language', 'receive_notifications', 'receive_emails']


class PortalThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalTheme
        fields = ['id', 'theme_mode', 'primary_color', 'font_size']


class PortalProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalProfile
        fields = ['id', 'display_name_ar', 'display_name_en', 'avatar_url', 'phone_number', 'email']


class PortalUserSerializer(serializers.ModelSerializer):
    profile = PortalProfileSerializer(read_only=True)
    preferences = PortalPreferenceSerializer(read_only=True)
    theme = PortalThemeSerializer(read_only=True)

    class Meta:
        model = PortalUser
        fields = ['id', 'user_type', 'is_active', 'last_login_at', 'profile', 'preferences', 'theme']


class ParentProfileSerializer(serializers.ModelSerializer):
    portal_profile = PortalProfileSerializer(read_only=True)

    class Meta:
        model = ParentProfile
        fields = ['id', 'portal_profile', 'national_id', 'occupation', 'employer', 'emergency_contact', 'linked_students']


class StudentProfileSerializer(serializers.ModelSerializer):
    portal_profile = PortalProfileSerializer(read_only=True)

    class Meta:
        model = StudentProfile
        fields = ['id', 'portal_profile', 'student_id', 'student_number', 'academic_year', 'grade_level', 'section']


class ApplicantProfileSerializer(serializers.ModelSerializer):
    portal_profile = PortalProfileSerializer(read_only=True)

    class Meta:
        model = ApplicantProfile
        fields = ['id', 'portal_profile', 'application_id', 'admission_status', 'submitted_date']


class PortalNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalNotification
        fields = ['id', 'title', 'body', 'is_read', 'read_at', 'action_url', 'created_at']


class PortalAnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalAnnouncement
        fields = ['id', 'title', 'content', 'target_audience', 'publish_date', 'expiry_date']


class PortalMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalMessage
        fields = ['id', 'sender', 'receiver', 'subject', 'content', 'is_read', 'read_at', 'created_at']


class PortalTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalTask
        fields = ['id', 'title', 'description', 'due_date', 'status', 'priority']


class PortalSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalSettings
        fields = ['id', 'key', 'value', 'description']
