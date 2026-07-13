from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from apps.common.responses import StandardResponse
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.employees.domain.models import Employee, EmployeeProfile, EmployeeStatusHistory
from apps.employees.interfaces.serializers import EmployeeSerializer, EmployeeProfileSerializer, EmployeeStatusHistorySerializer
from apps.common.security import generate_temp_password

class EmployeeViewSet(BaseCRUDViewSet):
    model_class = Employee
    serializer_class = EmployeeSerializer

    @action(detail=True, methods=['post'], url_path='promote')
    def promote(self, request, pk=None):
        instance = self.get_object()
        new_position = request.data.get('new_position')
        instance.position = new_position
        instance.save()
        return StandardResponse(self.get_serializer(instance).data, message="تمت ترقية الموظف بنجاح.")

    @action(detail=True, methods=['post'], url_path='activate-account')
    def activate_user_account(self, request, pk=None):
        """تفعيل حساب الموظف، ربطه بالـ User، وتعيين دوره وصلاحياته وإرسال البيانات له"""
        employee = self.get_object()
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else employee.tenant_id
        user_id = request.user.id if request.user else None

        from django.contrib.auth import get_user_model
        User = get_user_model()

        # 1. إنشاء أو جلب المستخدم
        user, created = User.objects.get_or_create(
            email=employee.email,
            defaults={
                'username': f"emp_{employee.employee_number.lower().replace('-', '_')}",
                'first_name': employee.full_name_ar.split(' ')[0],
                'last_name': employee.full_name_ar.split(' ')[-1] if ' ' in employee.full_name_ar else 'موظف',
                'phone': employee.mobile,
                'national_id': employee.national_id,
                'status': 'active',
                'is_active': True,
            }
        )

        temp_password = generate_temp_password()
        if created:
            user.set_password(temp_password)
            user.save()

        # 2. تهيئة الأدوار النظامية وربط الدور المناسب (معلم أو إداري)
        from apps.identity.domain.rbac import UserRole, ensure_system_roles
        from apps.identity.application.services import PermissionCacheService

        roles = ensure_system_roles(tenant_id, created_by=user_id)

        teaching_departments = {'التعليم والإشراف', 'الشؤون الأكاديمية'}
        is_teacher = (
            (employee.position or '').strip() == 'معلم'
            or (employee.department or '').strip() in teaching_departments
        )
        role_code = 'teacher' if is_teacher else 'administrator'
        role = roles[role_code]

        # 3. ربط المستخدم بالدور
        UserRole.objects.get_or_create(
            tenant_id=tenant_id,
            user=user,
            role=role
        )
        PermissionCacheService.clear_user_permissions_cache(user.id, tenant_id)

        # 3.ب إنشاء حساب بوابة الخدمة الذاتية للموظف (PortalUser نوع employee)
        from apps.portal.domain.models import PortalUser, PortalProfile
        portal_user, _ = PortalUser.objects.get_or_create(
            user=user,
            defaults={
                'user_type': 'employee',
                'tenant_id': tenant_id,
                'created_by': user_id,
            }
        )
        PortalProfile.objects.get_or_create(
            portal_user=portal_user,
            defaults={
                'display_name_ar': employee.full_name_ar,
                'phone_number': employee.mobile or '',
                'email': employee.email,
                'tenant_id': tenant_id,
                'created_by': user_id,
            }
        )

        # 4. إرسال الإشعار التلقائي بالبريد والواتساب
        from apps.communications.application.services import CommunicationService
        from apps.communications.application.provisioning import ensure_communication_defaults
        ensure_communication_defaults(tenant_id, created_by=user_id)

        variables = {
            'employee_name': employee.full_name_ar,
            'email': user.email,
            'password': temp_password,
            'portal_url': 'https://portal.nebras.edu/login'
        }

        try:
            CommunicationService.send_message(
                tenant_id=tenant_id,
                channel_code='email',
                recipients=[{
                    'type': 'to',
                    'entity_type': 'user',
                    'entity_id': user.id,
                    'name': employee.full_name_ar,
                    'address': user.email
                }],
                subject="تفعيل حساب الموظف - منصة نبراس التعليمية",
                body="مرحباً {{employee_name}}، تم تفعيل حساب الموظف الخاص بك. بريدك الإلكتروني: {{email}} وكلمة المرور المؤقتة: {{password}}. يمكنك الدخول عبر الرابط: {{portal_url}}",
                variables=variables,
                priority='high',
                source_module='employees',
                source_event='employee_activated'
            )
        except Exception:
            pass

        if employee.mobile:
            try:
                CommunicationService.send_message(
                    tenant_id=tenant_id,
                    channel_code='whatsapp',
                    recipients=[{
                        'type': 'to',
                        'entity_type': 'user',
                        'entity_id': user.id,
                        'name': employee.full_name_ar,
                        'address': employee.mobile
                    }],
                    body="مرحباً {{employee_name}}، تم تفعيل حسابك كـ موظف/معلم بنجاح. اسم المستخدم: {{email}} وكلمة المرور: {{password}}. رابط الدخول: {{portal_url}}",
                    variables=variables,
                    priority='high',
                    source_module='employees',
                    source_event='employee_activated'
                )
            except Exception:
                pass

        return StandardResponse({
            'user_id': str(user.id),
            'email': user.email,
            'role': role_code,
            'portal_user_id': str(portal_user.id)
        }, message="تم تفعيل حساب الموظف (دخول النظام + بوابة الخدمة الذاتية) وإرسال تفاصيل الدخول بنجاح.")

class EmployeeProfileViewSet(BaseCRUDViewSet):
    model_class = EmployeeProfile
    serializer_class = EmployeeProfileSerializer

class EmployeeStatusHistoryViewSet(BaseCRUDViewSet):
    model_class = EmployeeStatusHistory
    serializer_class = EmployeeStatusHistorySerializer