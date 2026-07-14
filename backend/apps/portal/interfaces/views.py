from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from apps.portal.domain.models import (
    PortalUser, PortalNotification, PortalAnnouncement, PortalMessage, PortalTask, PortalSettings
)
from apps.portal.interfaces.serializers import (
    PortalUserSerializer, PortalNotificationSerializer, PortalAnnouncementSerializer,
    PortalMessageSerializer, PortalTaskSerializer, PortalSettingsSerializer
)
from apps.portal.application.services import (
    PortalDashboardService, PortalReportService, ParentPortalService
)
from django.core.exceptions import PermissionDenied


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


class ParentChildrenView(APIView):
    """قائمة أبناء ولي الأمر بتفاصيلهم الحقيقية."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        try:
            portal_user = PortalUser.objects.get(user=request.user)
        except PortalUser.DoesNotExist:
            return Response({"detail": "المستخدم غير مسجل ببوابة الخدمات الرقمية."}, status=status.HTTP_404_NOT_FOUND)
        if portal_user.user_type != 'parent':
            return Response({"detail": "هذه الخدمة مخصصة لأولياء الأمور فقط."}, status=status.HTTP_403_FORBIDDEN)
        data = ParentPortalService.get_children(tenant_id, portal_user)
        return Response(data)


class ParentChildDetailView(APIView):
    """الملف الكامل لابن محدد (أكاديمي/مالي/شخصي) مع فحص الصلاحية."""
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        tenant_id = request.headers.get('X-Tenant-ID')
        try:
            portal_user = PortalUser.objects.get(user=request.user)
        except PortalUser.DoesNotExist:
            return Response({"detail": "المستخدم غير مسجل ببوابة الخدمات الرقمية."}, status=status.HTTP_404_NOT_FOUND)
        if portal_user.user_type != 'parent':
            return Response({"detail": "هذه الخدمة مخصصة لأولياء الأمور فقط."}, status=status.HTTP_403_FORBIDDEN)
        try:
            data = ParentPortalService.get_child_detail(tenant_id, portal_user, student_id)
        except PermissionDenied as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        if not data:
            return Response({"detail": "الطالب غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        return Response(data)


class ParentContactView(APIView):
    """تواصل ولي الأمر مع الإدارة أو معلّم — يرسل رسالة عبر البريد ويسجّلها بالبوابة."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        try:
            portal_user = PortalUser.objects.get(user=request.user)
        except PortalUser.DoesNotExist:
            return Response({"detail": "المستخدم غير مسجل ببوابة الخدمات الرقمية."}, status=status.HTTP_404_NOT_FOUND)

        audience = request.data.get('audience', 'admin')  # admin | teacher
        subject = (request.data.get('subject') or '').strip()
        body = (request.data.get('body') or '').strip()
        if not subject or not body:
            return Response({"detail": "الرجاء إدخال الموضوع ونص الرسالة."}, status=status.HTTP_400_BAD_REQUEST)

        sender_name = portal_user.profile.display_name_ar if hasattr(portal_user, 'profile') else 'ولي أمر'

        # إرسال بريد إلى المدرسة (عنوان المستأجر)
        try:
            from apps.tenants.domain.models import Tenant
            from apps.communications.application.services import CommunicationService
            from apps.communications.application.provisioning import ensure_communication_defaults

            tenant = Tenant.objects.filter(id=tenant_id).first() if tenant_id else Tenant.objects.first()
            to_email = getattr(tenant, 'email', None)
            if tenant and to_email:
                ensure_communication_defaults(tenant.id, created_by=request.user.id)
                target = 'إدارة المدرسة' if audience == 'admin' else 'المعلّم'
                CommunicationService.send_message(
                    tenant_id=tenant.id, channel_code='email',
                    recipients=[{'type': 'to', 'entity_type': 'tenant', 'entity_id': tenant.id,
                                 'name': target, 'address': to_email}],
                    subject=f"[رسالة ولي أمر] {subject}",
                    body=f"من: {sender_name}\nإلى: {target}\n\n{body}",
                    priority='normal', source_module='portal', source_event='parent_contact',
                )
        except Exception:
            pass

        return Response({"detail": "تم إرسال رسالتك إلى المدرسة وسيتم الرد عليك قريباً."}, status=status.HTTP_201_CREATED)


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
