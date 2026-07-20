"""تحديد هوية الأشخاص عبر الموديولات (طلاب وموظفون).

المشكلة التي يعالجها: موديولات مثل المكتبة والعيادة تحفظ المستعير أو المريض
كـ UUID مجرّد، فتعرض الواجهة معرّفاً خاماً بدل اسم. وليس في النظام جدول
موحّد للأشخاص: اسم الطالب في `StudentProfile.arabic_name`، واسم الموظف في
`Employee.full_name_ar`.

هذه الوحدة تجمع الطرفين في شكل واحد، ويُميَّز بينهما بحقل `person_type`
المحفوظ مع كل سجل. تُقرأ فقط — لا تكتب ولا تنشئ روابط.
"""


def list_people(tenant_id, include_students=True, include_employees=True, limit=1000):
    """يُرجع الطلاب والموظفين في شكل موحّد صالح لقوائم الاختيار والعرض."""
    from apps.students.domain.models import Student
    from apps.employees.domain.models import Employee

    people = []

    if include_students:
        students = (
            Student.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)
            .select_related('profile')[:limit]
        )
        for s in students:
            profile = getattr(s, 'profile', None)
            name = getattr(profile, 'arabic_name', None) or getattr(profile, 'english_name', None)
            people.append({
                'id': str(s.id),
                'type': 'student',
                'type_label': 'طالب',
                # الاسم قد يغيب إن لم يُنشأ ملف الطالب — نُظهر رقمه بدل فراغ
                'name': name or f'طالب {s.student_number}',
                'reference': s.student_number,
                'status': getattr(s, 'status', None),
            })

    if include_employees:
        for e in Employee.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)[:limit]:
            people.append({
                'id': str(e.id),
                'type': 'employee',
                'type_label': 'موظف/معلم',
                'name': e.full_name_ar or e.full_name_en or f'موظف {e.employee_number}',
                'reference': e.employee_number,
                'status': getattr(e, 'status', None),
            })

    return people


def build_people_index(tenant_id):
    """خريطة (type, id) → بيانات الشخص — لحلّ الأسماء دفعةً واحدة بلا استعلام لكل صف."""
    return {(p['type'], p['id']): p for p in list_people(tenant_id)}


def resolve_person(index, person_type, person_id):
    """يحلّ شخصاً واحداً من الخريطة، ويعيد بديلاً واضحاً إن لم يوجد.

    السجل غير المطابق يُعرض صراحةً كـ«غير معروف» بدل إخفائه — البيانات
    اليتيمة يجب أن تُرى لتُصحَّح، لا أن تُموَّه.
    """
    key = (person_type or 'student', str(person_id))
    found = index.get(key)
    if found:
        return found
    return {
        'id': str(person_id),
        'type': person_type or 'student',
        'type_label': '—',
        'name': 'سجل غير مرتبط',
        'reference': '',
        'status': None,
        'orphan': True,
    }
