from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from apps.common.responses import StandardResponse
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.faculty.domain.models import FacultyMember, TeacherProfile, AcademicQualification, TeachingLicense, TeacherAssignment, TeacherAvailability
from apps.faculty.interfaces.serializers import (
    FacultyMemberSerializer, TeacherProfileSerializer, AcademicQualificationSerializer,
    TeachingLicenseSerializer, TeacherAssignmentSerializer, TeacherAvailabilitySerializer
)

class FacultyMemberViewSet(BaseCRUDViewSet):
    model_class = FacultyMember
    serializer_class = FacultyMemberSerializer

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        instance = self.get_object()
        instance.status = 'approved'
        instance.save()
        return StandardResponse(self.get_serializer(instance).data, message="تمت الموافقة على تعيين عضو هيئة التدريس بنجاح.")

    @action(detail=True, methods=['post'], url_path='activate-account')
    def activate_account(self, request, pk=None):
        """تفعيل حساب المعلم: دخول النظام + بوابة خدمة ذاتية + إرسال بيانات الدخول.

        يستخدم سجل الموظف المرتبط (Employee) المتزامن تلقائياً من الموارد البشرية.
        """
        member = self.get_object()
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else member.tenant_id
        user_id = request.user.id if request.user else None

        # ضمان وجود سجل الموظف المرتبط (يُنشأ/يُزامن عبر save)
        if not member.employee:
            member.save()
            member.refresh_from_db()
        employee = member.employee
        if not employee:
            raise ValidationError("تعذّر ربط عضو هيئة التدريس بسجل موظف في الموارد البشرية.")

        from apps.employees.application.services import activate_staff_account
        try:
            result = activate_staff_account(employee, tenant_id, actor_id=user_id)
        except ValueError as e:
            raise ValidationError(str(e))

        if result.get('already_active'):
            message = "هذا المعلم لديه حساب مفعّل مسبقاً. لإرسال بيانات دخول جديدة استخدم إعادة تعيين كلمة المرور."
        else:
            message = "تم تفعيل حساب المعلم (دخول النظام + بوابة الخدمة الذاتية) وإرسال تفاصيل الدخول بنجاح."
        return StandardResponse(result, message=message)

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """إعادة تعيين كلمة مرور حساب المعلم وإرسال الكلمة الجديدة عبر البريد وواتساب."""
        member = self.get_object()
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else member.tenant_id
        user_id = request.user.id if request.user else None

        employee = member.employee
        if not employee:
            raise ValidationError("لا يوجد سجل موظف مرتبط بعضو هيئة التدريس. يرجى تفعيل الحساب أولاً.")

        from apps.employees.application.services import reset_staff_password
        try:
            result = reset_staff_password(employee, tenant_id, actor_id=user_id)
        except ValueError as e:
            raise ValidationError(str(e))

        return StandardResponse(
            result,
            message="تم إعادة تعيين كلمة المرور وإرسال بيانات الدخول الجديدة عبر البريد الإلكتروني وواتساب.",
        )

class TeacherProfileViewSet(BaseCRUDViewSet):
    model_class = TeacherProfile
    serializer_class = TeacherProfileSerializer

class AcademicQualificationViewSet(BaseCRUDViewSet):
    model_class = AcademicQualification
    serializer_class = AcademicQualificationSerializer

class TeachingLicenseViewSet(BaseCRUDViewSet):
    model_class = TeachingLicense
    serializer_class = TeachingLicenseSerializer

class TeacherAssignmentViewSet(BaseCRUDViewSet):
    model_class = TeacherAssignment
    serializer_class = TeacherAssignmentSerializer

class TeacherAvailabilityViewSet(BaseCRUDViewSet):
    model_class = TeacherAvailability
    serializer_class = TeacherAvailabilitySerializer