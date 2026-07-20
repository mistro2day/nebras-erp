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
            ('عدد سجلات الحضور', total),
            ('أيام الحضور المسجّلة', present),
            ('أيام الغياب', total - present),
        ],
        'empty': total == 0,
    }


def students_count_by_status(tenant_id, status: str = 'active') -> Dict[str, Any]:
    """عدد الطلاب حسب حالة القيد."""
    from apps.students.domain.models import Student

    count = Student.objects.filter(tenant_id=tenant_id, status=status).count()
    labels = {
        'active': 'نشط',
        'enrolled': 'مسجّل',
        'graduated': 'متخرّج',
        'withdrawn': 'منسحب',
        'suspended': 'موقوف',
        'applicant': 'متقدّم',
    }
    return {
        'headline': f'عدد الطلاب بحالة «{labels.get(status, status)}»',
        'value': count,
        'unit': 'طالب',
        'facts': [],
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
    collection_rate = round((_money(agg['paid']) / billed) * 100, 1) if billed else 0.0

    return {
        'headline': f'المتأخرات المالية {PERIOD_LABELS.get(period, period)}',
        'value': round(outstanding, 2),
        'unit': 'ريال',
        'facts': [
            ('عدد الفواتير المرحّلة', agg['invoices'] or 0),
            ('إجمالي المفوتر', round(billed, 2)),
            ('إجمالي المحصّل', round(_money(agg['paid']), 2)),
            ('نسبة التحصيل', f'{collection_rate}%'),
        ],
        'empty': (agg['invoices'] or 0) == 0,
    }


def collections_total(tenant_id, period: str = 'this_month') -> Dict[str, Any]:
    """إجمالي المبالغ المحصّلة من الطلاب خلال الفترة."""
    from apps.student_finance.domain.models import StudentInvoice

    since = _period_start(period)
    agg = StudentInvoice.objects.filter(
        tenant_id=tenant_id, status='posted', issue_date__gte=since,
    ).aggregate(paid=Sum('paid_amount'), invoices=Count('id'))

    return {
        'headline': f'إجمالي التحصيل {PERIOD_LABELS.get(period, period)}',
        'value': round(_money(agg['paid']), 2),
        'unit': 'ريال',
        'facts': [('عدد الفواتير المشمولة', agg['invoices'] or 0)],
        'empty': (agg['invoices'] or 0) == 0,
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

    # جلب الأسماء دفعة واحدة بدل استعلام لكل طالب.
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
    total_debtors = StudentBillingAccount.objects.filter(
        tenant_id=tenant_id, outstanding_balance__gt=0,
    ).count()

    return {
        'headline': f'الطلاب الذين عليهم متأخرات (أعلى {len(accounts)})',
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

    # ربط كل طالب بصفّه عبر آخر تسجيل له.
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
    if unknown:
        facts.append(('طلاب بلا تسجيل صف', f'{unknown:,.0f} ريال'))

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

    return {
        'headline': f'الطلاب الأكثر غياباً {PERIOD_LABELS.get(period, period)}',
        'value': len(rows),
        'unit': 'طالب',
        'facts': [(str(r['student_id']), f"{r['absences']} يوم غياب") for r in rows],
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
                'عدد الطلاب المسجّلين في حالة قيد معيّنة. '
                'استخدمه لأسئلة أعداد الطلاب، مثل: «كم عدد الطلاب النشطين؟».'
            ),
            handler=students_count_by_status,
            params={
                'status': {
                    'type': 'string',
                    'enum': ['active', 'enrolled', 'graduated', 'withdrawn', 'suspended', 'applicant'],
                    'description': 'حالة قيد الطالب. استخدم active إن لم يحدّد المستخدم حالة.',
                },
            },
            required=['status'],
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
