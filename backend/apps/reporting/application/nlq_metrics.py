"""
سجل المقاييس المعتمدة للاستعلام باللغة الطبيعية (NLQ Metric Registry).

المبدأ الأمني الحاكم: النموذج اللغوي **لا يولّد SQL ولا يلمس قاعدة البيانات**.
كل ما يفعله هو اختيار مقياس من هذا السجل وتعبئة معاملاته المحدَّدة مسبقاً.
التنفيذ الفعلي يمرّ عبر الـ ORM في الدوال أدناه، فيبقى عزل المستأجر
(`tenant_id`) والحذف اللطيف مفروضَين في الطبقة التي لا يستطيع النموذج تجاوزها.

إضافة مقياس جديد = دالة + إدخال في METRIC_REGISTRY. لا تُضاف قدرة للنموذج
إلا بمرور المطوّر من هنا.
"""
from dataclasses import dataclass, field
from datetime import timedelta
from decimal import Decimal
from typing import Any, Callable, Dict, List

from django.db.models import Count, Q, Sum
from django.utils import timezone


# ============================================================
# أدوات مساعدة
# ============================================================

PERIOD_CHOICES = ['today', 'this_week', 'this_month', 'this_term', 'this_year']

PERIOD_LABELS = {
    'today': 'اليوم',
    'this_week': 'هذا الأسبوع',
    'this_month': 'هذا الشهر',
    'this_term': 'هذا الفصل الدراسي',
    'this_year': 'هذا العام',
}


def _period_start(period: str):
    """تحويل وسم الفترة إلى تاريخ بداية. الافتراضي: هذا الشهر."""
    today = timezone.localdate()
    if period == 'today':
        return today
    if period == 'this_week':
        return today - timedelta(days=today.weekday())
    if period == 'this_term':
        return today - timedelta(days=120)
    if period == 'this_year':
        return today.replace(month=1, day=1)
    return today.replace(day=1)


def _money(value) -> float:
    return float(value or Decimal('0'))


def _normalize_text(text: str) -> str:
    """تنظيف وتوحيد نص البحث."""
    text = (text or '').lower()
    text = text.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    text = text.replace('ة', 'ه').replace('ى', 'ي')
    return text


# ============================================================
# تعريف المقياس
# ============================================================

@dataclass
class Metric:
    """
    مقياس واحد قابل للاستدعاء من محرك NLQ.

    `description` و `params` هما ما يراه النموذج اللغوي — اكتبهما بوضوح،
    فهما أساس اختياره الصحيح للمقياس.
    """
    key: str
    title: str
    description: str
    handler: Callable[..., Dict[str, Any]]
    params: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    required: List[str] = field(default_factory=list)

    def _json_schema(self) -> Dict[str, Any]:
        return {
            'type': 'object',
            'properties': self.params,
            'required': self.required,
            'additionalProperties': False,
        }

    def tool_schema(self) -> Dict[str, Any]:
        """تعريف الأداة بصيغة OpenAI — يفهمها Gemini وGroq وCerebras وOllama."""
        return {
            'type': 'function',
            'function': {
                'name': self.key,
                'description': self.description,
                'parameters': self._json_schema(),
            },
        }

    def validate(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        تحقّق من المعاملات في الـ Python.

        ضروري لأن ضمان المخطط الصارم (strict) غير متاح لدى كل المزوّدين —
        فلا نعتمد على النموذج في احترام الـ enum، بل نفرضه هنا. أي قيمة
        خارج المسموح تُستبدل بالافتراضي بدل تمريرها إلى الاستعلام.
        """
        clean: Dict[str, Any] = {}
        for name, spec in self.params.items():
            if name not in (params or {}):
                continue
            value = params[name]
            if spec.get('type') == 'integer':
                try:
                    value = int(value)
                except (TypeError, ValueError):
                    continue
            elif spec.get('type') == 'string':
                value = str(value)
                if 'enum' in spec and value not in spec['enum']:
                    continue  # قيمة مهلوسة — نتجاهلها ونترك الافتراضي
            clean[name] = value
        return clean


# ============================================================
# المقاييس — كل دالة تستقبل tenant_id إجبارياً وتصفّي به
# ============================================================

def student_attendance_rate(tenant_id, period: str = 'this_month') -> Dict[str, Any]:
    """نسبة حضور الطلاب خلال الفترة المطلوبة."""
    from apps.attendance.domain.models import StudentDailyAttendance

    since = _period_start(period)
    qs = StudentDailyAttendance.objects.filter(tenant_id=tenant_id, date__gte=since)

    totals = qs.aggregate(
        total=Count('id'),
        present=Count('id', filter=Q(status='present')),
    )
    total = totals['total'] or 0
    present = totals['present'] or 0
    rate = round((present / total) * 100, 1) if total else 0.0

    return {
        'headline': f'نسبة حضور الطلاب {PERIOD_LABELS.get(period, period)}',
        'value': rate,
        'unit': '%',
        'facts': [
            ('عدد سجلات الحضور المسجّلة', total),
            ('أيام الحضور المقبولة', present),
            ('أيام الغياب', total - present),
        ],
        'empty': total == 0,
    }


def students_count_by_status(tenant_id, status: str = 'active') -> Dict[str, Any]:
    """عدد الطلاب حسب حالة القيد."""
    from apps.students.domain.models import Student

    labels = {
        'active': 'نشط ومسجّل',
        'enrolled': 'مسجّل',
        'registered': 'مُدخل في النظام',
        'graduated': 'متخرّج',
        'withdrawn': 'منسحب',
        'suspended': 'موقوف',
        'applicant': 'متقدّم',
    }

    if status in ['active', 'enrolled', 'registered']:
        qs = Student.objects.filter(tenant_id=tenant_id, status__in=['active', 'enrolled', 'registered'])
        display_status = 'نشط ومسجّل'
    else:
        qs = Student.objects.filter(tenant_id=tenant_id, status=status)
        display_status = labels.get(status, status)

    count = qs.count()
    total_all = Student.objects.filter(tenant_id=tenant_id).count()

    return {
        'headline': f'عدد الطلاب بحالة «{display_status}»',
        'value': count,
        'unit': 'طالب',
        'facts': [
            ('عدد الطلاب في هذه الحالة', count),
            ('إجمالي السجلات لجميع الحالات', total_all),
        ],
        'empty': count == 0 and total_all == 0,
    }


def total_students_count(tenant_id) -> Dict[str, Any]:
    """إجمالي عدد الطلاب المسجلين في النظام."""
    from apps.students.domain.models import Student

    total = Student.objects.filter(tenant_id=tenant_id).count()
    active_count = Student.objects.filter(
        tenant_id=tenant_id, status__in=['active', 'enrolled', 'registered']
    ).count()

    return {
        'headline': 'إجمالي عدد الطلاب المسجلين',
        'value': total,
        'unit': 'طالب',
        'facts': [
            ('عدد الطلاب المقيدين/النشطين', active_count),
            ('إجمالي السجلات الكلي', total),
        ],
        'empty': total == 0,
    }


def general_entity_counter(tenant_id, entity_type: str = 'students') -> Dict[str, Any]:
    """إحصاء وحساب شامل لجميع الكيانات والموديولات في نظام نبراس ERP حسب الكلمة المفتاحية."""
    entity = _normalize_text(entity_type or 'students')

    if any(k in entity for k in ['teacher', 'employee', 'معلم', 'موظف', 'كادر']):
        from apps.employees.domain.models import Employee
        count = Employee.objects.filter(tenant_id=tenant_id).count()
        return {
            'headline': 'إجمالي المعلمين والموظفين في المدرسة',
            'value': count,
            'unit': 'موظف/معلم',
            'facts': [('عدد الموظفين المعينين', count)],
            'empty': count == 0,
        }

    if any(k in entity for k in ['bus', 'vehicle', 'حافلة', 'باص', 'نقل', 'سيارة']):
        from apps.transport.domain.models import Vehicle
        count = Vehicle.objects.filter(tenant_id=tenant_id).count()
        return {
            'headline': 'إجمالي حافلات ومركبات النقل المدرسي',
            'value': count,
            'unit': 'مركبة',
            'facts': [('عدد الحافلات المسجلة', count)],
            'empty': count == 0,
        }

    if any(k in entity for k in ['book', 'library', 'كتاب', 'مكتبة', 'استعارة']):
        from apps.library.domain.models import Book
        count = Book.objects.filter(tenant_id=tenant_id).count()
        return {
            'headline': 'إجمالي الكتب المتاحة في المكتبة',
            'value': count,
            'unit': 'كتاب',
            'facts': [('عدد عناوين الكتب المسجلة', count)],
            'empty': count == 0,
        }

    if any(k in entity for k in ['clinic', 'health', 'عيادة', 'زيارة صحية', 'طبي']):
        from apps.clinic.domain.models import ClinicVisit
        count = ClinicVisit.objects.filter(tenant_id=tenant_id).count()
        return {
            'headline': 'إجمالي زيارات العيادة المدرسية',
            'value': count,
            'unit': 'زيارة',
            'facts': [('عدد الزيارات والفحوصات المسجلة', count)],
            'empty': count == 0,
        }


def latest_clinic_visit(tenant_id) -> Dict[str, Any]:
    """آخر طالب زار العيادة المدرسية تفصيلياً من قاعدة البيانات."""
    from apps.clinic.domain.models import ClinicVisit
    from apps.students.domain.models import StudentProfile, Student

    visit = ClinicVisit.objects.filter(tenant_id=tenant_id, patient_type='student').order_by('-check_in_time').first()
    if not visit:
        visit = ClinicVisit.objects.filter(tenant_id=tenant_id).order_by('-check_in_time').first()

    if visit:
        student_name = 'طالب مسجّل'
        sp = StudentProfile.objects.filter(tenant_id=tenant_id, student_id=visit.patient_user_id).first()
        if sp:
            student_name = sp.arabic_name
        else:
            st = Student.objects.filter(tenant_id=tenant_id, id=visit.patient_user_id).first()
            if st and hasattr(st, 'profile'):
                student_name = st.profile.arabic_name

        visit_type_labels = {
            'walk_in': 'حالة عابرة/طارئة',
            'scheduled': 'كشف دوري',
            'emergency': 'حالة طارئة جداً',
            'follow_up': 'متابعة حالة صحية',
        }
        type_str = visit_type_labels.get(visit.visit_type, 'كشف طبي')
        created_str = visit.check_in_time.strftime('%Y-%m-%d %H:%M') if visit.check_in_time else 'مؤخراً'

        return {
            'headline': f'آخر طالب زار العيادة المدرسية: {student_name}',
            'value': student_name,
            'unit': '',
            'facts': [
                ('اسم الطالب', student_name),
                ('نوع الزيارة', type_str),
                ('تاريخ ووقت الدخول للعيادة', created_str),
            ],
            'empty': False,
        }

    return {
        'headline': 'آخر طالب زار العيادة المدرسية',
        'value': 'لا يوجد زيارات مسجلة',
        'unit': '',
        'facts': [('عدد الزيارات الطبية في العيادة', 0)],
        'empty': True,
    }

    if any(k in entity for k in ['application', 'admission', 'قبول', 'طلب تسجيل', 'متقدم']):
        from apps.admissions.domain.models import Applicant
        count = Applicant.objects.filter(tenant_id=tenant_id).count()
        return {
            'headline': 'إجمالي المتقدمين لطلبات القبول والتسجيل',
            'value': count,
            'unit': 'متقدم/طلب',
            'facts': [('عدد طلبات الالتحاق المستلمة', count)],
            'empty': count == 0,
        }

    if any(k in entity for k in ['subject', 'course', 'مادة', 'مقرر']):
        from apps.academics.domain.models import Grade
        count = Grade.objects.filter(tenant_id=tenant_id).count()
        return {
            'headline': 'إجمالي الصفوف والمناهج المقررة',
            'value': count,
            'unit': 'منهج/صف',
            'facts': [('عدد الخواص والصفوف المسجلة بالخطة', count)],
            'empty': count == 0,
        }

    if any(k in entity for k in ['class', 'classroom', 'شعبة', 'فصل', 'قاعة']):
        from apps.academics.domain.models import Section
        count = Section.objects.filter(tenant_id=tenant_id).count()
        return {
            'headline': 'إجمالي الشعب والفصول الدراسية',
            'value': count,
            'unit': 'شعبة/فصل',
            'facts': [('عدد الشعب الدراسية المفعلة', count)],
            'empty': count == 0,
        }

    from apps.students.domain.models import Student
    count = Student.objects.filter(tenant_id=tenant_id).count()
    return {
        'headline': 'إجمالي عدد الطلاب المسجلين',
        'value': count,
        'unit': 'طالب',
        'facts': [('إجمالي الطلاب المسجلين بالنظام', count)],
        'empty': count == 0,
    }


def students_count_by_grade_name(tenant_id, grade_keyword: str = 'الأول') -> Dict[str, Any]:
    """عدد الطلاب المسجلين في صف معين حسب اسمه (مثل الأول، الثاني، الثالث...)."""
    from apps.academics.domain.models import Grade
    from apps.students.domain.models import StudentEnrollment, Student

    k = _normalize_text(grade_keyword or 'الأول')

    aliases = {
        'الاول': ['الاول', 'اول', '1'],
        'الثاني': ['الثاني', 'ثاني', '2'],
        'الثالث': ['الثالث', 'ثالث', '3'],
        'الرابع': ['الرابع', 'رابع', '4'],
        'الخامس': ['الخامس', 'خامس', '5'],
        'السادس': ['السادس', 'سادس', '6'],
    }

    search_terms = [k]
    for key, terms in aliases.items():
        if any(t in k for t in terms):
            search_terms = terms
            break

    all_grades = Grade.objects.filter(tenant_id=tenant_id)
    matching_grades = []
    for g in all_grades:
        g_name_norm = _normalize_text(g.name)
        if any(term in g_name_norm for term in search_terms):
            matching_grades.append(g)

    grade_ids = [g.id for g in matching_grades]
    grade_names = [g.name for g in matching_grades]

    if grade_ids:
        student_ids = StudentEnrollment.objects.filter(
            tenant_id=tenant_id, grade_id__in=grade_ids
        ).values_list('student_id', flat=True).distinct()
        count = student_ids.count()
    else:
        count = Student.objects.filter(tenant_id=tenant_id).count()

    display_name = "، ".join(grade_names) if grade_names else grade_keyword

    return {
        'headline': f'عدد طلاب «{display_name}»',
        'value': count,
        'unit': 'طالب',
        'facts': [
            ('الصفوف المطابقة للبحث', display_name or 'جميع الصفوف'),
            ('عدد الطلاب في هذا الصف', count),
        ],
        'empty': count == 0,
    }


def outstanding_receivables(tenant_id, period: str = 'this_year') -> Dict[str, Any]:
    """إجمالي المتأخرات المالية غير المسددة على الطلاب."""
    from apps.student_finance.domain.models import StudentInvoice

    since = _period_start(period)
    qs = StudentInvoice.objects.filter(
        tenant_id=tenant_id, status='posted', issue_date__gte=since,
    )
    agg = qs.aggregate(
        billed=Sum('total_amount'),
        paid=Sum('paid_amount'),
        outstanding=Sum('outstanding_amount'),
        invoices=Count('id'),
    )
    outstanding = _money(agg['outstanding'])
    billed = _money(agg['billed'])
    paid = _money(agg['paid'])
    invoices_count = agg['invoices'] or 0
    collection_rate = round((paid / billed) * 100, 1) if billed else 0.0

    return {
        'headline': f'المتأخرات المالية {PERIOD_LABELS.get(period, period)}',
        'value': round(outstanding, 2),
        'unit': 'ريال',
        'facts': [
            ('عدد الفواتير المرحّلة', invoices_count),
            ('إجمالي المفوتر', round(billed, 2)),
            ('إجمالي المحصّل', round(paid, 2)),
            ('نسبة التحصيل', f'{collection_rate}%'),
        ],
        'empty': invoices_count == 0,
    }


def collections_total(tenant_id, period: str = 'this_month') -> Dict[str, Any]:
    """إجمالي المبالغ المحصّلة من الطلاب خلال الفترة."""
    from apps.student_finance.domain.models import StudentInvoice

    since = _period_start(period)
    agg = StudentInvoice.objects.filter(
        tenant_id=tenant_id, status='posted', issue_date__gte=since,
    ).aggregate(paid=Sum('paid_amount'), invoices=Count('id'))

    paid = _money(agg['paid'])
    invoices_count = agg['invoices'] or 0

    return {
        'headline': f'إجمالي التحصيل {PERIOD_LABELS.get(period, period)}',
        'value': round(paid, 2),
        'unit': 'ريال',
        'facts': [('عدد الفواتير المشمولة', invoices_count)],
        'empty': invoices_count == 0,
    }


def student_debtors(tenant_id, limit: int = 10) -> Dict[str, Any]:
    """أسماء الطلاب الذين عليهم متأخرات مالية، مرتّبين بالأعلى مديونية."""
    from apps.student_finance.domain.models import StudentBillingAccount
    from apps.students.domain.models import StudentProfile

    accounts = list(
        StudentBillingAccount.objects
        .filter(tenant_id=tenant_id, outstanding_balance__gt=0)
        .order_by('-outstanding_balance')[: max(1, min(limit, 50))]
    )

    student_ids = [a.student_id for a in accounts]
    names = dict(
        StudentProfile.objects
        .filter(tenant_id=tenant_id, student_id__in=student_ids)
        .values_list('student_id', 'arabic_name')
    )

    facts = [
        (names.get(a.student_id, f'طالب {str(a.student_id)[:8]}'), f'{_money(a.outstanding_balance):,.0f} ريال')
        for a in accounts
    ]
    total_debtors = len(accounts)

    return {
        'headline': f'الطلاب الذين عليهم متأخرات (أعلى {total_debtors})',
        'value': total_debtors,
        'unit': 'طالب مدين',
        'facts': facts,
        'empty': not accounts,
    }


def outstanding_by_grade(tenant_id) -> Dict[str, Any]:
    """إجمالي المتأخرات المالية موزّعاً حسب الصف الدراسي."""
    from collections import defaultdict

    from apps.academics.domain.models import Grade
    from apps.students.domain.models import StudentEnrollment
    from apps.student_finance.domain.models import StudentBillingAccount

    accounts = StudentBillingAccount.objects.filter(
        tenant_id=tenant_id, outstanding_balance__gt=0,
    ).values_list('student_id', 'outstanding_balance')

    debt_by_student = {sid: amt for sid, amt in accounts}
    enrollments = (
        StudentEnrollment.objects
        .filter(tenant_id=tenant_id, student_id__in=list(debt_by_student.keys()))
        .values('student_id', 'grade_id')
    )
    grade_of = {e['student_id']: e['grade_id'] for e in enrollments}
    grade_names = dict(
        Grade.objects.filter(tenant_id=tenant_id).values_list('id', 'name')
    )

    totals: Dict[Any, float] = defaultdict(float)
    unknown = 0.0
    for sid, amt in debt_by_student.items():
        gid = grade_of.get(sid)
        if gid is None:
            unknown += _money(amt)
        else:
            totals[gid] += _money(amt)

    facts = sorted(
        [(grade_names.get(gid, 'صف غير معروف'), f'{amt:,.0f} ريال') for gid, amt in totals.items()],
        key=lambda x: float(x[1].replace(',', '').replace(' ريال', '')),
        reverse=True,
    )
    grand = sum(_money(a) for a in debt_by_student.values())

    return {
        'headline': 'المتأخرات المالية حسب الصف',
        'value': round(grand, 2),
        'unit': 'ريال',
        'facts': facts,
        'empty': not debt_by_student,
    }


def absence_leaderboard(tenant_id, period: str = 'this_month', limit: int = 5) -> Dict[str, Any]:
    """الطلاب الأكثر غياباً خلال الفترة."""
    from apps.attendance.domain.models import StudentDailyAttendance

    since = _period_start(period)
    rows = (
        StudentDailyAttendance.objects
        .filter(tenant_id=tenant_id, date__gte=since)
        .exclude(status='present')
        .values('student_id')
        .annotate(absences=Count('id'))
        .order_by('-absences')[: max(1, min(limit, 20))]
    )
    rows = list(rows)
    facts = [(str(r['student_id']), f"{r['absences']} يوم غياب") for r in rows]

    return {
        'headline': f'الطلاب الأكثر غياباً {PERIOD_LABELS.get(period, period)}',
        'value': len(facts),
        'unit': 'طالب',
        'facts': facts,
        'empty': not rows,
    }


# ============================================================
# السجل — مصدر الحقيقة الوحيد لقدرات المحرّك
# ============================================================

_PERIOD_PARAM = {
    'type': 'string',
    'enum': PERIOD_CHOICES,
    'description': 'الفترة الزمنية المطلوبة. استخدم this_month إن لم يحدّد المستخدم فترة.',
}

METRIC_REGISTRY: Dict[str, Metric] = {
    m.key: m for m in [
        Metric(
            key='student_attendance_rate',
            title='نسبة حضور الطلاب',
            description=(
                'نسبة حضور الطلاب المئوية خلال فترة زمنية. '
                'استخدمه لأسئلة الحضور والغياب والانضباط، مثل: '
                '«ما نسبة حضور الطلاب هذا الشهر؟».'
            ),
            handler=student_attendance_rate,
            params={'period': _PERIOD_PARAM},
            required=['period'],
        ),
        Metric(
            key='students_count_by_status',
            title='عدد الطلاب حسب الحالة',
            description=(
                'عدد الطلاب المقيدين بحالة معينة (نشط، متخرج، منسحب...). '
                'استخدمه عند السؤال عن طلاب حالة محددة.'
            ),
            handler=students_count_by_status,
            params={
                'status': {
                    'type': 'string',
                    'enum': ['active', 'enrolled', 'registered', 'graduated', 'withdrawn', 'suspended', 'applicant'],
                    'description': 'حالة قيد الطالب. استخدم active إن لم يحدّد المستخدم حالة.',
                },
            },
            required=['status'],
        ),
        Metric(
            key='total_students_count',
            title='إجمالي عدد الطلاب',
            description=(
                'إجمالي عدد الطلاب المسجلين في المدرسة. '
                'استخدمه عند السؤال عن إجمالي عدد الطلاب أو كم عدد الطلاب.'
            ),
            handler=total_students_count,
            params={},
            required=[],
        ),
        Metric(
            key='students_count_by_grade_name',
            title='عدد طلاب صف معين',
            description=(
                'عدد الطلاب المسجلين في صف دراسي معين حسب اسمه (الأول، الثاني، الثالث...). '
                'استخدمه عند السؤال عن عدد طلاب صف محدد مثل: «كم عدد طلاب الصف الأول؟».'
            ),
            handler=students_count_by_grade_name,
            params={
                'grade_keyword': {
                    'type': 'string',
                    'description': 'اسم أو الكلمة المفتاحية للصف (الأول، الثاني، الثالث، الرابع، الخامس، السادس...).',
                },
            },
            required=['grade_keyword'],
        ),
        Metric(
            key='outstanding_receivables',
            title='المتأخرات المالية',
            description=(
                'إجمالي المبالغ غير المسددة على الطلاب مع نسبة التحصيل. '
                'استخدمه لأسئلة المديونيات والمتأخرات والذمم.'
            ),
            handler=outstanding_receivables,
            params={'period': _PERIOD_PARAM},
            required=['period'],
        ),
        Metric(
            key='collections_total',
            title='إجمالي التحصيل',
            description=(
                'إجمالي المبالغ المحصّلة فعلياً من الطلاب خلال فترة. '
                'استخدمه لأسئلة الإيرادات والتحصيل والمقبوضات.'
            ),
            handler=collections_total,
            params={'period': _PERIOD_PARAM},
            required=['period'],
        ),
        Metric(
            key='student_debtors',
            title='الطلاب المدينون',
            description=(
                'قائمة بأسماء الطلاب الذين عليهم متأخرات مالية مع مبلغ كل واحد، '
                'مرتّبة بالأعلى مديونية. استخدمه لأسئلة مثل: «من الطلاب الذين '
                'عليهم متأخرات؟» أو «أعطني أسماء المدينين».'
            ),
            handler=student_debtors,
            params={
                'limit': {
                    'type': 'integer',
                    'description': 'عدد الطلاب المطلوب عرضهم (1 إلى 50). الافتراضي 10.',
                },
            },
            required=['limit'],
        ),
        Metric(
            key='outstanding_by_grade',
            title='المتأخرات حسب الصف',
            description=(
                'إجمالي المتأخرات المالية موزّعاً حسب الصف الدراسي. '
                'استخدمه لأسئلة مثل: «إجمالي المتأخرات حسب الصف» أو '
                '«أي الصفوف عليها متأخرات أكثر؟».'
            ),
            handler=outstanding_by_grade,
            params={},
            required=[],
        ),
        Metric(
            key='absence_leaderboard',
            title='الأكثر غياباً',
            description=(
                'قائمة الطلاب الأكثر غياباً خلال فترة. '
                'استخدمه لأسئلة «من أكثر الطلاب غياباً» أو «أعلى نسب الغياب».'
            ),
            handler=absence_leaderboard,
            params={
                'period': _PERIOD_PARAM,
                'limit': {
                    'type': 'integer',
                    'description': 'عدد الطلاب المطلوب عرضهم (1 إلى 20). الافتراضي 5.',
                },
            },
            required=['period', 'limit'],
        ),
        Metric(
            key='general_entity_counter',
            title='استعلام مفتوح عن جميع الموديولات',
            description=(
                'استعلام عام ومفتوح عن أي موديول أو جدول في النظام '
                '(المعلمين، الموظفين، الحافلات، العيادة، الكتب، القبول، المواد، الفصول...). '
                'استخدمه لأي سؤال مفتوح عن عناصر النظام.'
            ),
            handler=general_entity_counter,
            params={
                'entity_type': {
                    'type': 'string',
                    'description': 'الكلمة المفتاحية للكيان (employees, teachers, buses, books, clinic, applications, subjects, classrooms, students).',
                },
            },
            required=['entity_type'],
        ),
        Metric(
            key='latest_clinic_visit',
            title='آخر طالب زار العيادة المدرسية',
            description=(
                'تفاصيل الطالب وسبب وتاريخ آخر زيارة صحية للعيادة المدرسية. '
                'استخدمه عند السؤال عن: «من آخر طالب زار العيادة؟» أو «آخر زيارة للعيادة».'
            ),
            handler=latest_clinic_visit,
            params={},
            required=[],
        ),
    ]
}


def tool_definitions() -> List[Dict[str, Any]]:
    """تعريفات الأدوات التي تُمرَّر إلى النموذج اللغوي."""
    return [m.tool_schema() for m in METRIC_REGISTRY.values()]


def run_metric(tenant_id, key: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    تنفيذ مقياس بعد التحقّق من وجوده في السجل.

    يرفض أي مفتاح خارج السجل — فحتى لو أعاد النموذج اسماً غير متوقّع
    لا يمكنه الوصول إلى شيء لم يُسجَّل هنا صراحةً.
    """
    metric = METRIC_REGISTRY.get(key)
    if metric is None:
        raise KeyError(f'مقياس غير معروف: {key}')

    allowed = metric.validate(params)
    result = metric.handler(tenant_id=tenant_id, **allowed)
    result['metric_key'] = key
    result['metric_title'] = metric.title
    result['params_used'] = allowed
    return result
