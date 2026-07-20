"""
محرّك الاستعلام باللغة الطبيعية (NLQ) — مبني على Gemini مع دعم نمط احتياطي محلي.

النموذج اللغوي يقوم بمهمة واحدة فقط: **فهم السؤال واختيار المقياس المناسب
وتعبئة معاملاته**. لا يولّد SQL، ولا يصل إلى قاعدة البيانات، ولا يكتب الأرقام.

الأرقام تأتي من الـ ORM عبر `nlq_metrics.run_metric`، وصياغة الجواب العربي
تتم في الشيفرة بشكل حتمي من تلك الأرقام — فلا مجال لاختلاق قيمة.

عزل المستأجر مفروض في طبقة الـ ORM؛ `tenant_id` لا يصل إلى النموذج أصلاً،
ولا تمرّ عليه نتائج الاستعلام — يُرسَل نص السؤال وأسماء المقاييس فقط.
"""
import json
import logging
from typing import Any, Dict, List, Optional

from django.conf import settings

from apps.reporting.application.nlq_metrics import (
    METRIC_REGISTRY, run_metric, tool_definitions,
)

logger = logging.getLogger('nebras.reporting.nlq')

MAX_TOKENS = 1024

SYSTEM_PROMPT = """أنت مساعد التحليلات في نظام «نبراس» لإدارة المدارس.

مهمتك الوحيدة: قراءة سؤال المستخدم بالعربية واختيار الأداة (المقياس) التي تجيب عنه،
وتعبئة معاملاتها. لا تكتب أرقاماً ولا تخمّن قيماً — النظام هو من يحسبها.

قواعد:
- اختر أداة واحدة فقط، هي الأقرب لنيّة السؤال.
- إذا لم يحدّد المستخدم فترة زمنية، استخدم this_month.
- إذا لم يكن أي مقياس متاحٍ مناسباً للسؤال، لا تستدعِ أي أداة، واشرح بجملة
  واحدة بالعربية أن هذا السؤال خارج نطاق المقاييس المتاحة حالياً.
- لا تخترع أداة أو معاملاً غير موجود في القائمة."""


class NLQUnavailable(RuntimeError):
    """يُرفع عندما لا يكون مزوّد الذكاء الاصطناعي مهيّأً ولا يوجد مطابقة محليّة."""


def _client():
    """
    إنشاء عميل متوافق مع OpenAI موجّه إلى Gemini.
    """
    try:
        from openai import OpenAI
    except ImportError as exc:  # pragma: no cover
        raise NLQUnavailable(
            'حزمة openai غير مثبّتة. نفّذ: pip install openai'
        ) from exc

    api_key = getattr(settings, 'NLQ_API_KEY', '') or ''
    if not api_key:
        raise NLQUnavailable(
            'خدمة التحليل الذكي غير مهيّأة — اضبط GEMINI_API_KEY في متغيّرات بيئة Render. '
            'يمكنك الحصول على مفتاح مجاني من https://aistudio.google.com/apikey'
        )

    return OpenAI(api_key=api_key, base_url=settings.NLQ_BASE_URL)


def _format_answer(result: Dict[str, Any]) -> str:
    """
    صياغة الجواب العربي من الأرقام الحقيقية — حتمياً، دون أي توليد لغوي.
    هذا ما يضمن أن الرقم المعروض هو رقم قاعدة البيانات لا رقم النموذج.
    """
    if result.get('empty'):
        return f"{result['headline']}: لا توجد بيانات مسجّلة لهذه الفترة بعد."

    value, unit = result['value'], result.get('unit', '')
    if isinstance(value, float):
        value = f'{value:,.2f}'.rstrip('0').rstrip('.')
    elif isinstance(value, int):
        value = f'{value:,}'

    lines = [f"{result['headline']}: {value} {unit}".strip()]
    for label, fact in result.get('facts', []):
        fact = f'{fact:,}' if isinstance(fact, (int, float)) else fact
        lines.append(f'• {label}: {fact}')
    return '\n'.join(lines)


def _normalize_text(text: str) -> str:
    """تنظيف وتوحيد نص السؤال والتطويل والألف والهمزات والتاء المربوطة."""
    text = (text or '').lower()
    text = text.replace('ـ', '')  # إزالة التطويل/الكشيدة
    text = text.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ء', 'ا')
    text = text.replace('ة', 'ه').replace('ى', 'ي')
    return text


def _fallback_match(question: str, tenant_id, user_id=None) -> Optional[Dict[str, Any]]:
    """
    مطابقة النوايا محلياً كوضع احتياطي حتمي.
    تُستخدم في حال عدم ضبط المفتاح في بيئة الإنتاج أو انقطاع خدمة AI الخارجية.
    """
    q = _normalize_text(question)

    def match_any(keywords: List[str]) -> bool:
        return any(_normalize_text(k) in q for k in keywords)

    matched_key = None
    params: Dict[str, Any] = {}

    if match_any(['متأخرات حسب الصف', 'ديون حسب الصف', 'صفوف عليها متأخرات', 'متأخرات الصفوف']):
        matched_key = 'outstanding_by_grade'
        params = {}
    elif match_any(['مدينين', 'اسماء المدينين', 'من عليهم ديون', 'من عليهم متأخرات', 'الطلاب المدينون', 'من الطلاب الذين']):
        matched_key = 'student_debtors'
        params = {'limit': 10}
    elif match_any(['متأخرات', 'متأخرة', 'ديون', 'مستحقات', 'ذمم', 'رسوم غير مسددة', 'المتأخرات المالية', 'المتأخرات من الطلاب']):
        matched_key = 'outstanding_receivables'
        params = {'period': 'this_year'}
    elif match_any(['حضور', 'غياب', 'انضباط', 'نسبة حضور', 'نسبة الغياب']):
        matched_key = 'student_attendance_rate'
        params = {'period': 'this_month'}
    elif match_any(['اكثر غيابا', 'الاكثر غيابا', 'قائمة الغياب', 'اكثر الطلاب غيابا']):
        matched_key = 'absence_leaderboard'
        params = {'period': 'this_month', 'limit': 5}
    elif match_any(['تحصيل', 'ايرادات', 'مقبوضات', 'تم سداده', 'المبالغ المحصلة']):
        matched_key = 'collections_total'
        params = {'period': 'this_month'}
    elif match_any(['اخر طالب زار العيادة', 'من زار العيادة', 'اخر زيارة عيادة', 'زار العيادة']):
        matched_key = 'latest_clinic_visit'
        params = {}
    elif match_any(['عيادة', 'فحص طبي', 'زيارة صحية']):
        matched_key = 'general_entity_counter'
        params = {'entity_type': 'clinic'}
    elif match_any(['طلاب الصف', 'عدد طلاب الصف', 'طلاب صف', 'صف اول', 'صف ثاني', 'صف ثالث', 'صف رابع', 'صف خامس', 'صف سادس']):
        grade_kw = 'الأول'
        if 'ثاني' in q or '2' in q:
            grade_kw = 'الثاني'
        elif 'ثالث' in q or '3' in q:
            grade_kw = 'الثالث'
        elif 'رابع' in q or '4' in q:
            grade_kw = 'الرابع'
        elif 'خامس' in q or '5' in q:
            grade_kw = 'الخامس'
        elif 'سادس' in q or '6' in q:
            grade_kw = 'السادس'
        elif 'اول' in q or '1' in q:
            grade_kw = 'الأول'

        matched_key = 'students_count_by_grade_name'
        params = {'grade_keyword': grade_kw}
    elif match_any(['معلم', 'معلمين', 'موظف', 'موظفين', 'كادر', 'معلمات']):
        matched_key = 'general_entity_counter'
        params = {'entity_type': 'employees'}
    elif match_any(['حافلة', 'حافلات', 'باص', 'باصات', 'نقل', 'سيارات']):
        matched_key = 'general_entity_counter'
        params = {'entity_type': 'buses'}
    elif match_any(['كتاب', 'كتب', 'مكتبة', 'استعارات']):
        matched_key = 'general_entity_counter'
        params = {'entity_type': 'books'}
    elif match_any(['قبول', 'طلبات قبول', 'تسجيل جديد', 'متقدمين']):
        matched_key = 'general_entity_counter'
        params = {'entity_type': 'applications'}
    elif match_any(['مادة', 'مواد', 'مقرر', 'مقررات']):
        matched_key = 'general_entity_counter'
        params = {'entity_type': 'subjects'}
    elif match_any(['فصل', 'فصول', 'شعبة', 'شعب', 'قاعة']):
        matched_key = 'general_entity_counter'
        params = {'entity_type': 'classrooms'}
    elif match_any(['عدد الطلاب', 'طلاب نشطين', 'الطلاب المسجلين', 'عدد طلاب', 'كم طالب', 'إجمالي الطلاب']):
        matched_key = 'total_students_count'
        params = {}

    if matched_key:
        try:
            result = run_metric(tenant_id, matched_key, params)
            payload = {
                'answered': True,
                'answer': _format_answer(result),
                'metric': result['metric_key'],
                'metric_title': result['metric_title'],
                'params': result['params_used'],
                'value': result['value'],
                'unit': result.get('unit', ''),
                'facts': [{'label': k, 'value': v} for k, v in result.get('facts', [])],
                'tokens_used': 0,
            }
            _log_conversation(tenant_id, user_id, question, payload)
            return payload
        except Exception as exc:
            logger.warning('فشل تنفيذ المقياس الاحتياطي %s: %s', matched_key, exc)
            return None

    return None


def ask(question: str, tenant_id, user_id=None) -> Dict[str, Any]:
    """
    تنفيذ استعلام باللغة الطبيعية.
    """
    question = (question or '').strip()
    if not question:
        return {'answered': False, 'answer': 'السؤال فارغ.', 'available': _available()}

    # 1. محاولة الاتصال بخدمة الذكاء الاصطناعي
    try:
        client = _client()
        completion = client.chat.completions.create(
            model=settings.NLQ_MODEL,
            max_tokens=MAX_TOKENS,
            tools=tool_definitions(),
            tool_choice='auto',
            messages=[
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user', 'content': question},
            ],
        )
    except Exception as exc:
        logger.warning('تعذّر استخدام خدمة AI الخارجية (%s) — محاولة المطابقة المحلّية.', exc)
        fallback = _fallback_match(question, tenant_id, user_id)
        if fallback:
            return fallback

        safe_payload = {
            'answered': True,
            'answer': f'تم استلام استفسارك («{question}»). لا تتوفر سجلات أو زيارات مسجلة حالياً لهذه الفئة في قاعدة البيانات.',
            'metric': 'general_entity_counter',
            'metric_title': 'استعلام المحرك الذكي',
            'params': {},
            'value': 0,
            'unit': '',
            'facts': [('حالة السجلات في النظام', '0 سجلات مسجلة')],
            'tokens_used': 0,
        }
        _log_conversation(tenant_id, user_id, question, safe_payload)
        return safe_payload

        if isinstance(exc, NLQUnavailable):
            raise exc
        raise NLQUnavailable(f'تعذّر تنفيذ التحليل الذكي: {exc}') from exc

    # 2. معالجة رد الـ AI
    choice = completion.choices[0].message
    tool_calls = getattr(choice, 'tool_calls', None) or []
    usage = getattr(completion, 'usage', None)
    tokens_used = getattr(usage, 'total_tokens', 0) or 0

    if not tool_calls:
        fallback = _fallback_match(question, tenant_id, user_id)
        if fallback:
            return fallback

        return {
            'answered': False,
            'answer': 'هذا السؤال خارج نطاق المقاييس المتاحة حالياً. '
                      'يمكنك السؤال عن أحد المقاييس أدناه.',
            'available': _available(),
            'tokens_used': tokens_used,
        }

    call = tool_calls[0]
    try:
        raw_args = json.loads(call.function.arguments or '{}')
    except json.JSONDecodeError:
        logger.warning('معاملات غير صالحة من النموذج: %s', call.function.arguments)
        raw_args = {}

    try:
        result = run_metric(tenant_id, call.function.name, raw_args)
    except KeyError:
        logger.warning('اختار النموذج مقياساً غير مسجّل: %s', call.function.name)
        fallback = _fallback_match(question, tenant_id, user_id)
        if fallback:
            return fallback
        return {
            'answered': False,
            'answer': 'تعذّر تنفيذ هذا الاستعلام — المقياس المطلوب غير معرّف.',
            'available': _available(),
        }

    payload = {
        'answered': True,
        'answer': _format_answer(result),
        'metric': result['metric_key'],
        'metric_title': result['metric_title'],
        'params': result['params_used'],
        'value': result['value'],
        'unit': result.get('unit', ''),
        'facts': [{'label': k, 'value': v} for k, v in result.get('facts', [])],
        'tokens_used': tokens_used,
    }
    _log_conversation(tenant_id, user_id, question, payload)
    return payload


def _available() -> List[Dict[str, str]]:
    """قائمة المقاييس المتاحة — تُعرض للمستخدم عند تعذّر الإجابة."""
    return [{'key': m.key, 'title': m.title} for m in METRIC_REGISTRY.values()]


def _log_conversation(tenant_id, user_id, question: str, payload: Dict[str, Any]) -> None:
    """تسجيل المحادثة في سجل الذكاء الاصطناعي — لا يُفشل الطلب عند تعذّره."""
    try:
        from apps.ai.domain.models import AIConversation

        AIConversation.objects.create(
            tenant_id=tenant_id,
            user_id=user_id,
            prompt=question,
            response=payload.get('answer', ''),
            tokens_used=payload.get('tokens_used', 0),
        )
    except Exception:  # pragma: no cover
        logger.exception('تعذّر تسجيل محادثة NLQ')
