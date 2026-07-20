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

    def tool_schema(self) -> Dict[str, Any]:
        """توليد تعريف الأداة بصيغة Claude مع تحقّق صارم من المعاملات."""
        return {
            'name': self.key,
            'description': self.description,
            'strict': True,
            'input_schema': {
                'type': 'object',
                'properties': self.params,
                'required': self.required,
                'additionalProperties': False,
            },
        }


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

    allowed = {k: v for k, v in (params or {}).items() if k in metric.params}
    result = metric.handler(tenant_id=tenant_id, **allowed)
    result['metric_key'] = key
    result['metric_title'] = metric.title
    result['params_used'] = allowed
    return result
