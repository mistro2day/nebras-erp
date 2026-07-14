# -*- coding: utf-8 -*-
"""
خدمات تطبيقية لتفعيل حسابات الكادر (موظفون ومعلمون).

`activate_staff_account` هي المنطق المركزي الموحّد:
  - إنشاء/جلب مستخدم النظام (`User`) وكلمة مرور مؤقتة عشوائية.
  - تهيئة الأدوار النظامية وربط الدور المناسب (معلم/إداري) مع صلاحياته.
  - إنشاء حساب بوابة الخدمة الذاتية (`PortalUser` نوع employee).
  - إرسال بيانات الدخول عبر البريد الإلكتروني وواتساب.

تُستدعى من كل من `EmployeeViewSet` و`FacultyMemberViewSet` لتفادي التكرار.
"""
import logging

from apps.common.security import generate_temp_password

logger = logging.getLogger('nebras.employees')

TEACHING_DEPARTMENTS = {'التعليم والإشراف', 'الشؤون الأكاديمية'}


def _derive_role_code(employee) -> str:
    is_teacher = (
        (employee.position or '').strip() == 'معلم'
        or (employee.department or '').strip() in TEACHING_DEPARTMENTS
    )
    return 'teacher' if is_teacher else 'administrator'


def activate_staff_account(employee, tenant_id, actor_id=None):
    """
    تفعيل حساب موظف/معلم: دخول النظام + بوابة خدمة ذاتية + إرسال بيانات الدخول.

    يعيد dict بمعلومات الحساب الناتج.
    """
    from django.contrib.auth import get_user_model
    from apps.identity.domain.rbac import UserRole, ensure_system_roles
    from apps.identity.application.services import PermissionCacheService
    from apps.portal.domain.models import PortalUser, PortalProfile

    if not employee.email:
        raise ValueError("يجب توفّر البريد الإلكتروني للموظف لتفعيل حسابه.")

    User = get_user_model()

    # 1. المستخدم + كلمة المرور المؤقتة
    user, created = User.objects.get_or_create(
        email=employee.email,
        defaults={
            'username': f"emp_{employee.employee_number.lower().replace('-', '_')}",
            'first_name': (employee.full_name_ar or '').split(' ')[0],
            'last_name': (employee.full_name_ar or '').split(' ')[-1] if ' ' in (employee.full_name_ar or '') else 'موظف',
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

    # 2. الأدوار النظامية + ربط الدور المناسب
    roles = ensure_system_roles(tenant_id, created_by=actor_id)
    role_code = _derive_role_code(employee)
    role = roles[role_code]
    UserRole.objects.get_or_create(tenant_id=tenant_id, user=user, role=role)
    PermissionCacheService.clear_user_permissions_cache(user.id, tenant_id)

    # 3. حساب بوابة الخدمة الذاتية
    portal_user, _ = PortalUser.objects.get_or_create(
        user=user,
        defaults={'user_type': 'employee', 'tenant_id': tenant_id, 'created_by': actor_id}
    )
    PortalProfile.objects.get_or_create(
        portal_user=portal_user,
        defaults={
            'display_name_ar': employee.full_name_ar,
            'phone_number': employee.mobile or '',
            'email': employee.email,
            'tenant_id': tenant_id,
            'created_by': actor_id,
        }
    )

    # 4. الإرسال عبر البريد وواتساب — فقط عند إنشاء حساب جديد (كلمة مرور صالحة).
    #    إذا كان الحساب موجوداً مسبقاً لا نرسل كلمة مرور وهمية؛ يُستخدم "إعادة التعيين".
    if created:
        _send_staff_credentials(employee, user, temp_password, tenant_id, actor_id)

    return {
        'user_id': str(user.id),
        'email': user.email,
        'role': role_code,
        'portal_user_id': str(portal_user.id),
        'created': created,
        'already_active': not created,
    }


def _send_staff_credentials(employee, user, temp_password, tenant_id, actor_id=None):
    """إرسال بيانات الدخول للكادر عبر البريد وواتساب (قالب الترحيب النظامي)."""
    from apps.communications.application.services import CommunicationService
    from apps.communications.application.provisioning import ensure_communication_defaults

    ensure_communication_defaults(tenant_id, created_by=actor_id)
    variables = {
        'employee_name': employee.full_name_ar,
        'email': user.email,
        'password': temp_password,
        'portal_url': 'https://portal.nebras.edu/login',
    }
    try:
        CommunicationService.send_message(
            tenant_id=tenant_id, channel_code='email',
            recipients=[{'type': 'to', 'entity_type': 'user', 'entity_id': user.id,
                         'name': employee.full_name_ar, 'address': user.email}],
            template_code='account_welcome_employee_email',
            variables=variables, priority='high',
            source_module='employees', source_event='employee_activated',
        )
    except Exception as e:
        logger.error(f"فشل إرسال بريد تفعيل حساب الموظف: {e}")

    if employee.mobile:
        try:
            CommunicationService.send_message(
                tenant_id=tenant_id, channel_code='whatsapp',
                recipients=[{'type': 'to', 'entity_type': 'user', 'entity_id': user.id,
                             'name': employee.full_name_ar, 'address': employee.mobile}],
                template_code='account_welcome_employee_whatsapp',
                variables=variables, priority='high',
                source_module='employees', source_event='employee_activated',
            )
        except Exception as e:
            logger.error(f"فشل إرسال واتساب تفعيل حساب الموظف: {e}")


def reset_staff_password(employee, tenant_id, actor_id=None):
    """
    إعادة تعيين كلمة مرور حساب موظف/معلم موجود وإرسال الكلمة الجديدة.

    يشترط وجود حساب مستخدم مسبقاً؛ خلاف ذلك يُرفع ValueError لإرشاد المستخدم للتفعيل أولاً.
    يعيد dict بمعلومات العملية.
    """
    from django.contrib.auth import get_user_model

    if not employee.email:
        raise ValueError("يجب توفّر البريد الإلكتروني للموظف لإعادة تعيين كلمة المرور.")

    User = get_user_model()
    user = User.objects.filter(email=employee.email).first()
    if not user:
        raise ValueError("لا يوجد حساب مفعّل لهذا الموظف. يرجى تفعيل الحساب أولاً.")

    temp_password = generate_temp_password()
    user.set_password(temp_password)
    user.save(update_fields=['password'])

    _send_staff_credentials(employee, user, temp_password, tenant_id, actor_id)

    return {
        'user_id': str(user.id),
        'email': user.email,
        'reset': True,
    }
