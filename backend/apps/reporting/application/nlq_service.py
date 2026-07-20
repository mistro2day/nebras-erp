"""
محرّك الاستعلام باللغة الطبيعية (NLQ) — مبني على Claude.

النموذج اللغوي يقوم بمهمة واحدة فقط: **فهم السؤال واختيار المقياس المناسب
وتعبئة معاملاته**. لا يولّد SQL، ولا يصل إلى قاعدة البيانات، ولا يكتب الأرقام.

الأرقام تأتي من الـ ORM عبر `nlq_metrics.run_metric`، وصياغة الجواب العربي
تتم في الشيفرة بشكل حتمي من تلك الأرقام — فلا مجال لاختلاق قيمة.

عزل المستأجر مفروض في طبقة الـ ORM؛ `tenant_id` لا يصل إلى النموذج أصلاً.
"""
import logging
from typing import Any, Dict, List

from django.conf import settings

from apps.reporting.application.nlq_metrics import (
    METRIC_REGISTRY, run_metric, tool_definitions,
)

logger = logging.getLogger('nebras.reporting.nlq')

MODEL_ID = 'claude-opus-4-8'
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
    إنشاء عميل Anthropic.

    إن ضُبط ANTHROPIC_API_KEY في الإعدادات استُخدم مباشرة؛ وإلا تُرك للـ SDK
    ليحلّ بيانات الاعتماد من البيئة أو من ملف تعريف `ant auth login`.
    """
    try:
        import anthropic
    except ImportError as exc:  # pragma: no cover
        raise NLQUnavailable(
            'حزمة anthropic غير مثبّتة. نفّذ: pip install anthropic'
        ) from exc

    api_key = getattr(settings, 'ANTHROPIC_API_KEY', '') or ''
    try:
        return anthropic.Anthropic(api_key=api_key) if api_key else anthropic.Anthropic()
    except Exception as exc:
        raise NLQUnavailable(
            'خدمة التحليل الذكي غير مهيّأة — اضبط ANTHROPIC_API_KEY أو سجّل الدخول عبر `ant auth login`.'
        ) from exc


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

    # بيانات الاعتماد تُحلّ عند الاستدعاء لا عند إنشاء العميل، فيُلتقط غيابها هنا.
    try:
        message = client.messages.create(
            model=MODEL_ID,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            tools=tool_definitions(),
            thinking={'type': 'disabled'},
            messages=[{'role': 'user', 'content': question}],
        )
    except TypeError as exc:
        # الـ SDK يرفع TypeError عند تعذّر تحديد وسيلة المصادقة.
        if 'authentication' in str(exc).lower():
            raise NLQUnavailable(
                'خدمة التحليل الذكي غير مهيّأة — اضبط ANTHROPIC_API_KEY '
                'أو سجّل الدخول عبر `ant auth login`.'
            ) from exc
        raise
    except Exception as exc:
        import anthropic

        if isinstance(exc, anthropic.AuthenticationError):
            raise NLQUnavailable(
                'مفتاح Anthropic غير صالح — راجع إعداد ANTHROPIC_API_KEY.'
            ) from exc
        raise

    tool_use = next((b for b in message.content if b.type == 'tool_use'), None)

    if tool_use is None:
        # النموذج لم يجد مقياساً مناسباً — نصرّح بذلك بدل اختلاق جواب.
        note = next(
            (b.text for b in message.content if b.type == 'text'),
            'لا يوجد مقياس متاح يجيب عن هذا السؤال حالياً.',
        )
        return {
            'answered': False,
            'answer': note,
            'available': _available(),
            'tokens_used': message.usage.input_tokens + message.usage.output_tokens,
        }

    try:
        result = run_metric(tenant_id, tool_use.name, dict(tool_use.input))
    except KeyError:
        logger.warning('اختار النموذج مقياساً غير مسجّل: %s', tool_use.name)
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
        'tokens_used': message.usage.input_tokens + message.usage.output_tokens,
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
