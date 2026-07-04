from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.portal.domain.models import (
    PortalUser, PortalNotification, PortalAnnouncement, PortalMessage, PortalTask, PortalSettings
)
from apps.portal.interfaces.serializers import (
    PortalUserSerializer, PortalNotificationSerializer, PortalAnnouncementSerializer,
    PortalMessageSerializer, PortalTaskSerializer, PortalSettingsSerializer
)
from apps.portal.application.services import PortalDashboardService, PortalReportService


class ParentDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        # الحصول على مستخدم البوابة
        try:
            portal_user = PortalUser.objects.get(user=request.user)
            if portal_user.user_type != 'parent':
                return Response({"detail": "هذه اللوحة مخصصة لأولياء الأمور فقط."}, status=status.HTTP_403_FORBIDDEN)
        except PortalUser.DoesNotExist:
            return Response({"detail": "المستخدم غير مسجل ببوابة الخدمات الرقمية."}, status=status.HTTP_404_NOT_FOUND)

        data = PortalDashboardService.get_parent_dashboard_data(tenant_id, portal_user)
        return Response(data)


class StudentDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        try:
            portal_user = PortalUser.objects.get(user=request.user)
            if portal_user.user_type != 'student':
                return Response({"detail": "هذه اللوحة مخصصة للطلاب فقط."}, status=status.HTTP_403_FORBIDDEN)
        except PortalUser.DoesNotExist:
            return Response({"detail": "المستخدم غير مسجل ببوابة الخدمات الرقمية."}, status=status.HTTP_404_NOT_FOUND)

        data = PortalDashboardService.get_student_dashboard_data(tenant_id, portal_user)
        return Response(data)


class ApplicantDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        try:
            portal_user = PortalUser.objects.get(user=request.user)
            if portal_user.user_type != 'applicant':
                return Response({"detail": "هذه اللوحة مخصصة للمتقدمين فقط."}, status=status.HTTP_403_FORBIDDEN)
        except PortalUser.DoesNotExist:
            return Response({"detail": "المستخدم غير مسجل ببوابة الخدمات الرقمية."}, status=status.HTTP_404_NOT_FOUND)

        data = PortalDashboardService.get_applicant_dashboard_data(tenant_id, portal_user)
        return Response(data)


class PortalProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            portal_user = PortalUser.objects.get(user=request.user)
            serializer = PortalUserSerializer(portal_user)
            return Response(serializer.data)
        except PortalUser.DoesNotExist:
            return Response({"detail": "الملف الشخصي غير موجود."}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request):
        try:
            portal_user = PortalUser.objects.get(user=request.user)
        except PortalUser.DoesNotExist:
            return Response({"detail": "الملف الشخصي غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        
        # تحديث المظهر والتفضيلات والبيانات الشخصية
        profile_data = request.data.get('profile', {})
        theme_data = request.data.get('theme', {})
        pref_data = request.data.get('preferences', {})

        profile = portal_user.profile
        for attr, val in profile_data.items():
            setattr(profile, attr, val)
        profile.save()

        if hasattr(portal_user, 'theme') and theme_data:
            theme = portal_user.theme
            for attr, val in theme_data.items():
                setattr(theme, attr, val)
            theme.save()

        if hasattr(portal_user, 'preferences') and pref_data:
            pref = portal_user.preferences
            for attr, val in pref_data.items():
                setattr(pref, attr, val)
            pref.save()

        return Response(PortalUserSerializer(portal_user).data)


class PortalNotificationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PortalNotificationSerializer

    def get_queryset(self):
        try:
            portal_user = PortalUser.objects.get(user=self.request.user)
            return PortalNotification.objects.filter(portal_user=portal_user)
        except PortalUser.DoesNotExist:
            return PortalNotification.objects.none()

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        return Response({'status': 'marked as read'})


class PortalAnnouncementViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PortalAnnouncementSerializer
    queryset = PortalAnnouncement.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs.filter(is_published=True)


class PortalMessageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PortalMessageSerializer

    def get_queryset(self):
        try:
            portal_user = PortalUser.objects.get(user=self.request.user)
            return PortalMessage.objects.filter(receiver=portal_user) | PortalMessage.objects.filter(sender=portal_user)
        except PortalUser.DoesNotExist:
            return PortalMessage.objects.none()


class PortalTaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PortalTaskSerializer

    def get_queryset(self):
        try:
            portal_user = PortalUser.objects.get(user=self.request.user)
            return PortalTask.objects.filter(portal_user=portal_user)
        except PortalUser.DoesNotExist:
            return PortalTask.objects.none()


class PortalSettingsViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PortalSettingsSerializer
    queryset = PortalSettings.objects.all()


class PortalAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        # فحص دور المدير أو الصلاحية
        data = PortalReportService.get_portal_usage_statistics(tenant_id)
        return Response(data)
