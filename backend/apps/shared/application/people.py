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


_USER_NAME_CACHE = {}


def resolve_user_display_name(user_id, default=''):
    """جلب الاسم الكامل للمستخدم المنشئ للسندات والفواتير المالية من جدول المستخدمين وسجل الموظفين بشكل سريع ومخبأ بالذاكرة."""
    if not user_id:
        return default
    u_key = str(user_id)
    if u_key in _USER_NAME_CACHE:
        return _USER_NAME_CACHE[u_key]
    try:
        from apps.identity.domain.models import User
        u = User.objects.filter(id=user_id).first()
        if u:
            # 1. البحث في سجل الموظفين الإداريين بالبريد أو المعرف لجلب الاسم الرباعي المعتمد
            try:
                from apps.employees.domain.models import Employee
                emp = None
                if u.email:
                    emp = Employee.objects.filter(email=u.email, deleted_at__isnull=True).first()
                if not emp and u.username:
                    emp = Employee.objects.filter(employee_number=u.username, deleted_at__isnull=True).first()
                if emp and emp.full_name_ar:
                    _USER_NAME_CACHE[u_key] = emp.full_name_ar.strip()
                    return _USER_NAME_CACHE[u_key]
            except Exception:
                pass

            # 2. جلب الاسم من نموذج المستخدم (User)
            full = f"{u.first_name or ''} {u.last_name or ''}".strip()
            name = full or u.username or u.email or default
            _USER_NAME_CACHE[u_key] = name
            return name
    except Exception:
        pass
    return default

