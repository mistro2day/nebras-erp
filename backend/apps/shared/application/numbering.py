# -*- coding: utf-8 -*-
"""
مولّد أرقام المستندات الآمن (فواتير، طلبات شراء، أوامر شراء، إيصالات...).

لماذا لا يصلح `count() + 1`؟
  1. **الحذف اللطيف**: الصف المحذوف يبقى في الجدول ويحتفظ برقمه وبقيد التفرّد
     (tenant_id, number)، بينما المدير الافتراضي لا يعدّه — فيتولّد رقم مكرر
     ويفشل الحفظ بـ IntegrityError.
  2. **الفجوات**: أي حذف يُرجع العدّاد للخلف فيصطدم بأرقام قائمة.
  3. **التزامن**: طلبان متزامنان يحصلان على نفس العدد.

الحل: نقرأ أعلى رقم تسلسلي فعلي (شاملاً المحذوف لطيفاً) لنفس البادئة، ونزيد
عليه، مع محاولات إضافية للتعامل مع التسابق.
"""
import re


def _manager(model):
    """المدير الذي يرى كل الصفوف بما فيها المحذوفة لطيفاً (قيد التفرّد يشملها)."""
    return getattr(model, 'all_objects', model.objects)


def next_document_number(model, tenant_id, prefix, field='number', width=0):
    """
    يعيد الرقم التالي بالصيغة `{prefix}{seq}`.

    مثال: next_document_number(PurchaseRequest, tid, 'PR-260716-', 'request_number')
          -> 'PR-260716-3' إذا كان أعلى موجود هو 2 (ولو كان محذوفاً لطيفاً).
    """
    qs = _manager(model).filter(**{'tenant_id': tenant_id, f'{field}__startswith': prefix})
    existing = qs.values_list(field, flat=True)

    max_seq = 0
    pattern = re.compile(r'^' + re.escape(prefix) + r'(\d+)$')
    for value in existing:
        m = pattern.match(value or '')
        if m:
            max_seq = max(max_seq, int(m.group(1)))

    seq = max_seq + 1
    return f"{prefix}{str(seq).zfill(width) if width else seq}"


def generate_unique_number(model, tenant_id, prefix, field='number', width=0, attempts=25):
    """
    نسخة مقاومة للتسابق: تتخطّى أي رقم صار مستخدماً بين الحساب والحفظ.
    تُستخدم داخل معاملة؛ الحفظ نفسه يبقى محمياً بقيد التفرّد في قاعدة البيانات.
    """
    number = next_document_number(model, tenant_id, prefix, field, width)
    m = re.match(r'^' + re.escape(prefix) + r'(\d+)$', number)
    seq = int(m.group(1)) if m else 1

    for _ in range(attempts):
        candidate = f"{prefix}{str(seq).zfill(width) if width else seq}"
        exists = _manager(model).filter(**{'tenant_id': tenant_id, field: candidate}).exists()
        if not exists:
            return candidate
        seq += 1
    return f"{prefix}{seq}"
