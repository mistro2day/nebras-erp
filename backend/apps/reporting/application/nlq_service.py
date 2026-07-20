"""
محرّك الاستعلام باللغة الطبيعية (NLQ) — مبني على Gemini.

النموذج اللغوي يقوم بمهمة واحدة فقط: **فهم السؤال واختيار المقياس المناسب
وتعبئة معاملاته**. لا يولّد SQL، ولا يصل إلى قاعدة البيانات، ولا يكتب الأرقام.

الأرقام تأتي من الـ ORM عبر `nlq_metrics.run_metric`، وصياغة الجواب العربي
تتم في الشيفرة بشكل حتمي من تلك الأرقام — فلا مجال لاختلاق قيمة.

عزل المستأجر مفروض في طبقة الـ ORM؛ `tenant_id` لا يصل إلى النموذج أصلاً،
ولا تمرّ عليه نتائج الاستعلام — يُرسَل نص السؤال وأسماء المقاييس فقط.

نستخدم الواجهة المتوافقة مع OpenAI التي يوفّرها Gemini، فيمكن التحويل إلى
Groq أو Cerebras أو Ollama بتغيير NLQ_BASE_URL و NLQ_MODEL دون تعديل شيفرة.
"""
import json
import logging
from typing import Any, Dict, List

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
    """يُرفع عندما لا يكون مزوّد الذكاء الاصطناعي مهيّأً."""


def _client():
    """
    إنشاء عميل متوافق مع OpenAI موجّه إلى Gemini.

    نفس الشيفرة تعمل مع Groq أو Cerebras أو Ollama بتغيير NLQ_BASE_URL
    و NLQ_MODEL في الإعدادات — لا حاجة لتعديل أي منطق هنا.
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
            'خدمة التحليل الذكي غير مهيّأة — اضبط GEMINI_API_KEY في متغيّرات البيئة. '
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


def ask(question: str, tenant_id, user_id=None) -> Dict[str, Any]:
    """
    تنفيذ استعلام باللغة الطبيعية.

    ترجع dict فيها:
      - answered: هل أمكن الإجابة من المقاييس المتاحة
      - answer: نص الجواب العربي (مبني على أرقام حقيقية)
      - metric / params: المقياس الذي اختاره النموذج ومعاملاته (للشفافية)
      - value / unit / facts: الأرقام الخام لعرضها في الواجهة
    """
    question = (question or '').strip()
    if not question:
        return {'answered': False, 'answer': 'السؤال فارغ.', 'available': _available()}

    client = _client()

    try:
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
        from openai import AuthenticationError, RateLimitError

        if isinstance(exc, AuthenticationError):
            raise NLQUnavailable(
                'مفتاح الوصول غير صالح — راجع إعداد GEMINI_API_KEY.'
            ) from exc
        if isinstance(exc, RateLimitError):
            # الحصة المجانية محدودة يومياً؛ نوضّح السبب بدل خطأ عام.
            raise NLQUnavailable(
                'تم تجاوز الحصة المجانية للتحليل الذكي. حاول لاحقاً أو ارفع الحصة.'
            ) from exc
        raise

    choice = completion.choices[0].message
    tool_calls = getattr(choice, 'tool_calls', None) or []
    usage = getattr(completion, 'usage', None)
    tokens_used = getattr(usage, 'total_tokens', 0) or 0

    if not tool_calls:
        # النموذج لم يجد مقياساً مناسباً — نصرّح بذلك بدل اختلاق جواب.
        return {
            'answered': False,
            'answer': (choice.content or '').strip()
            or 'لا يوجد مقياس متاح يجيب عن هذا السؤال حالياً.',
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
