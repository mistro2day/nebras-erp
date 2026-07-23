# -*- coding: utf-8 -*-
"""
ربط أبناء الموظفين بالطلاب المسجّلين (Employee Dependent ↔ Student Linking)

المشكلة التي يحلّها:
    عقد الموظف يُكتب غالباً **قبل** تسجيل أبنائه بالمدرسة. فلا يمكن الربط
    اليدوي وقت العقد لأن الطالب لم يوجد بعد. والعكس وارد أيضاً: قد يكون
    الابن طالباً مسجّلاً قبل تعيين والده موظفاً.

الحل:
    لا نربط بالترتيب الزمني بل **بهوية ولي الأمر**. الرقم الوطني متوفّر على
    الطرفين: `Employee.national_id` و`StudentFamilyRelation.national_id`
    (المنقول من `admissions.Guardian`). فيكون الجسر ثابتاً أياً كان من سبق.

مبدأ السلامة:
    المطابقة تُنتج **اقتراحاً** لا ربطاً صامتاً — لأن أثر الخطأ مالي مباشر
    (خصم رسوم). التأكيد فعل بشري عبر `confirm_link`.

راجع: docs/modules/teacher-contract-bylaw.md (رابعاً: الأبناء · خامساً: الأقارب)
"""
import logging

from django.utils import timezone

logger = logging.getLogger('nebras.employees.linking')


def _normalize_id(value):
    """توحيد صيغة الرقم الوطني للمقارنة (إزالة الفراغات والفواصل)."""
    if not value:
        return ''
    return ''.join(ch for ch in str(value) if ch.isalnum())


def find_employee_for_student(tenant_id, student_id):
    """
    يُرجع الموظف الذي يكون هذا الطالب ابناً/قريباً له، عبر مطابقة الرقم الوطني
    لأي من أولياء أمر الطالب مع الرقم الوطني للموظفين. يُرجع None إن لم يوجد.
    """
    from apps.employees.domain.models import Employee
    from apps.students.domain.models import StudentFamilyRelation

    guardian_ids = {
        _normalize_id(nid)
        for nid in StudentFamilyRelation.objects.filter(
            student_id=student_id, tenant_id=tenant_id, deleted_at__isnull=True
        ).values_list('national_id', flat=True)
        if _normalize_id(nid)
    }
    if not guardian_ids:
        return None

    for emp in Employee.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).exclude(
        national_id__isnull=True
    ).exclude(national_id=''):
        if _normalize_id(emp.national_id) in guardian_ids:
            return emp
    return None


def _pick_declared_dependent(employee, student_name):
    """
    يختار التصريح غير المربوط الأقرب لاسم الطالب (مطابقة على أول اسمين
    لتجاوز اختلافات الاسم الرباعي). يُرجع None إن لم يوجد تصريح مناسب.
    """
    unlinked = list(employee.dependents.filter(student_id__isnull=True))
    if not unlinked:
        return None

    target = (student_name or '').strip().split()
    if target:
        key = ' '.join(target[:2])
        for dep in unlinked:
            declared = (dep.full_name or '').strip()
            if declared and (declared.startswith(key) or key.startswith(' '.join(declared.split()[:2]))):
                return dep
    return None


def suggest_links_for_student(tenant_id, student_id, student_name=''):
    """
    يقترح ربطاً لطالب واحد. يُرجع dict أو None:
        {employee, dependent (تصريح مطابق أو None), match_reason}
    """
    from apps.employees.domain.models import EmployeeDependent

    # مربوط سلفاً؟ لا اقتراح
    if EmployeeDependent.objects.filter(tenant_id=tenant_id, student_id=student_id).exists():
        return None

    employee = find_employee_for_student(tenant_id, student_id)
    if not employee:
        return None

    return {
        'employee': employee,
        'dependent': _pick_declared_dependent(employee, student_name),
        'match_reason': 'تطابق الرقم الوطني لولي الأمر مع موظف بالمدرسة',
    }


def confirm_link(tenant_id, student_id, employee, dependent=None, student_name='', relation_type='child'):
    """
    يؤكّد ربط طالب بموظف. يستخدم التصريح الممرَّر إن وُجد، وإلا ينشئ تصريحاً
    جديداً (حالة: لم يُصرّح الموظف بالابن أصلاً — الخصم حق لائحي لا يسقط بالسهو).

    لا يحتسب نسبة الخصم؛ النسبة يدخلها المستخدم (قرار موثّق في اللائحة).
    يُرجع سجل EmployeeDependent المربوط.
    """
    from apps.employees.domain.models import EmployeeDependent

    if dependent is None:
        dependent = EmployeeDependent.objects.create(
            tenant_id=tenant_id,
            employee=employee,
            full_name=student_name or 'ابن/ابنة الموظف',
            relation_type=relation_type,
            notes='أُنشئ تلقائياً عند ربط طالب مسجّل بملف موظف (لم يرد تصريح مسبق).',
        )

    dependent.student_id = student_id
    dependent.linked_at = timezone.now()
    dependent.save(update_fields=['student_id', 'linked_at', 'updated_at'])
    logger.info("ربط الطالب %s بالموظف %s (تصريح %s)", student_id, employee.id, dependent.id)
    return dependent


def unlink(dependent):
    """يفكّ الربط ويُبقي التصريح قائماً (لا يُحذف السجل)."""
    dependent.student_id = None
    dependent.linked_at = None
    dependent.save(update_fields=['student_id', 'linked_at', 'updated_at'])
    return dependent


def suggest_links_for_employee(tenant_id, employee):
    """
    الاتجاه المعاكس: عند تعيين موظف، يبحث عن طلاب مسجّلين أولياء أمرهم
    يحملون رقمه الوطني. يُرجع قائمة {student_id, student_name, dependent}.
    """
    from apps.employees.domain.models import EmployeeDependent
    from apps.students.domain.models import StudentFamilyRelation, StudentProfile

    nid = _normalize_id(employee.national_id)
    if not nid:
        return []

    student_ids = set()
    for rel in StudentFamilyRelation.objects.filter(
        tenant_id=tenant_id, deleted_at__isnull=True
    ).exclude(national_id__isnull=True).exclude(national_id=''):
        if _normalize_id(rel.national_id) == nid:
            student_ids.add(rel.student_id)

    if not student_ids:
        return []

    already = set(
        EmployeeDependent.objects.filter(
            tenant_id=tenant_id, student_id__in=student_ids
        ).values_list('student_id', flat=True)
    )

    results = []
    profiles = {
        p.student_id: p.arabic_name
        for p in StudentProfile.objects.filter(student_id__in=student_ids, tenant_id=tenant_id)
    }
    for sid in student_ids - already:
        name = profiles.get(sid, '')
        results.append({
            'student_id': sid,
            'student_name': name,
            'dependent': _pick_declared_dependent(employee, name),
        })
    return results


def get_discount_for_student(tenant_id, student_id):
    """
    يُرجع نسبة الخصم المستحقة لطالب لكونه ابن/قريب موظف، أو None.
    يستخدمه موديول المالية عند توليد الفاتورة.
    """
    from apps.employees.domain.models import EmployeeDependent

    dep = EmployeeDependent.objects.filter(
        tenant_id=tenant_id, student_id=student_id, deleted_at__isnull=True
    ).select_related('employee').first()
    if not dep:
        return None

    return {
        'percentage': 100 if dep.is_fully_exempt else float(dep.discount_percentage or 0),
        'is_fully_exempt': dep.is_fully_exempt,
        'relation_type': dep.relation_type,
        'employee_name': dep.employee.full_name_ar,
        'dependent_id': dep.id,
    }
