# -*- coding: utf-8 -*-
"""
خدمة طلبات السداد الأونلاين لأولياء الأمور (تحويل بنكي عبر بنك الخرطوم / بنكك).

المسار:
  1) ولي الأمر يقدّم طلب سداد ويرفق إيصال التحويل → الحالة «معلّق».
  2) المحاسب يراجع الطلب فيعتمده أو يرفضه.
     - الاعتماد: يولّد إيصال قبض مرحّل (Receipt) ويخصم من مستحقات الطالب بنظام FIFO،
       ويحاول ترحيل القيد المحاسبي إن كانت المالية مهيّأة (best-effort).
     - الرفض: يسجّل السبب.
  3) في الحالتين يُشعَر ولي الأمر (بريد بقالب نبراس + إشعار داخل البوابة).
"""
import logging
from decimal import Decimal
from datetime import date

from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.student_finance.domain.models import (
    OnlinePaymentRequest, StudentBillingAccount, StudentReceivable,
    PaymentAllocation, Receipt, StudentFinanceSettings,
)

from apps.shared.application.numbering import generate_unique_number

logger = logging.getLogger('nebras.student_finance')


def submit_payment_request(tenant_id, billing_account_id, amount, transfer_reference,
                           transfer_date, receipt_attachment, sender_name=None,
                           note=None, bank_name='بنك الخرطوم', submitted_by_user_id=None):
    """إنشاء طلب سداد أونلاين معلّق وإشعار المحاسبة."""
    account = StudentBillingAccount.objects.get(id=billing_account_id, tenant_id=tenant_id)
    amt = Decimal(str(amount))
    if amt <= 0:
        raise ValidationError("يجب أن يكون مبلغ السداد أكبر من صفر.")
    if not receipt_attachment:
        raise ValidationError("يجب إرفاق إيصال التحويل البنكي.")

    req = OnlinePaymentRequest.objects.create(
        tenant_id=tenant_id,
        student_billing_account=account,
        student_id=account.student_id,
        submitted_by_user_id=submitted_by_user_id,
        amount=amt,
        bank_name=bank_name or 'بنك الخرطوم',
        transfer_reference=transfer_reference,
        transfer_date=transfer_date,
        sender_name=sender_name,
        note=note,
        receipt_attachment=receipt_attachment,
        status='pending',
        created_by=submitted_by_user_id,
    )
    _notify_finance_new_request(req)
    return req


def _finance_recipient_user_ids(tenant_id):
    """معرّفات مستخدمي المالية/الإدارة الذين يستلمون إشعار طلب السداد."""
    ids = set()
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        for uid in User.objects.filter(is_superuser=True, deleted_at__isnull=True).values_list('id', flat=True):
            ids.add(uid)
    except Exception:
        pass
    try:
        from apps.identity.domain.rbac import Role, UserRole
        roles = Role.objects.filter(tenant_id=tenant_id, code__in=['administrator', 'accountant', 'finance'])
        for uid in UserRole.objects.filter(tenant_id=tenant_id, role__in=roles).values_list('user_id', flat=True):
            ids.add(uid)
    except Exception:
        pass
    return ids


def _notify_finance_new_request(req):
    """إشعار داخلي (مركز الإشعارات) لمستخدمي المالية بطلب سداد جديد قيد المراجعة."""
    try:
        from apps.communications.application.services import NotificationCenterService

        student_name = 'طالب'
        try:
            from apps.students.domain.models import Student
            s = Student.objects.filter(id=req.student_id).select_related('profile').first()
            student_name = getattr(getattr(s, 'profile', None), 'arabic_name', '') or student_name
        except Exception:
            pass

        title = "طلب سداد جديد قيد المراجعة"
        body = (f"قدّم ولي أمر الطالب {student_name} طلب سداد بمبلغ {req.amount:,.2f} "
                f"عبر {req.bank_name} (مرجع {req.transfer_reference}). بانتظار المراجعة والاعتماد.")
        for uid in _finance_recipient_user_ids(req.tenant_id):
            NotificationCenterService.create_notification(
                tenant_id=req.tenant_id, user_id=uid,
                title=title, body=body,
                category='finance', priority='high', icon='payments',
                action_url='/student-finance/online-payments',
                action_label='مراجعة الطلب',
                source_module='student_finance', source_event='online_payment_submitted',
                source_reference_id=req.id,
                group_key='online_payment_pending',
            )
    except Exception as e:
        logger.warning(f"تعذّر إنشاء إشعار المالية لطلب السداد {req.id}: {e}")


@transaction.atomic
def approve_payment_request(tenant_id, request_id, reviewer_id=None):
    """اعتماد طلب سداد: توليد إيصال قبض مرحّل + خصم المستحقات + إشعار ولي الأمر."""
    req = OnlinePaymentRequest.objects.select_for_update().get(id=request_id, tenant_id=tenant_id)
    if req.status != 'pending':
        raise ValidationError("لا يمكن اعتماد طلب تمّت مراجعته مسبقاً.")

    account = req.student_billing_account
    receipt = _settle_payment(tenant_id, account, req.amount, reviewer_id, req)

    req.status = 'approved'
    req.reviewed_by = reviewer_id
    req.reviewed_at = timezone.now()
    req.receipt_id = receipt.id
    req.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'receipt_id', 'posted_to_gl'])

    _notify_parent(req, approved=True)
    return req


@transaction.atomic
def reject_payment_request(tenant_id, request_id, reviewer_id=None, reason=None):
    """رفض طلب سداد مع تسجيل السبب وإشعار ولي الأمر."""
    req = OnlinePaymentRequest.objects.select_for_update().get(id=request_id, tenant_id=tenant_id)
    if req.status != 'pending':
        raise ValidationError("لا يمكن رفض طلب تمّت مراجعته مسبقاً.")
    if not reason:
        raise ValidationError("يرجى إدخال سبب الرفض ليطّلع عليه ولي الأمر.")

    req.status = 'rejected'
    req.reviewed_by = reviewer_id
    req.reviewed_at = timezone.now()
    req.rejection_reason = reason
    req.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'rejection_reason'])

    _notify_parent(req, approved=False)
    return req


def _resolve_bank_transfer_method(tenant_id):
    """يجلب/ينشئ طريقة دفع «تحويل بنكي» لربطها بالإيصال."""
    from apps.finance.domain.models import PaymentMethod
    pm = PaymentMethod.objects.filter(tenant_id=tenant_id, code='bank_transfer').first()
    if pm:
        return pm
    pm = PaymentMethod.objects.filter(tenant_id=tenant_id).first()
    if pm:
        return pm
    return PaymentMethod.objects.create(
        tenant_id=tenant_id, name_ar='تحويل بنكي', name_en='Bank Transfer',
        code='bank_transfer', status='active',
    )


def _settle_payment(tenant_id, account, amount, user_id, req):
    """
    يولّد إيصال قبض مرحّل ويخصم المستحقات (FIFO) ويحدّث الأرصدة.
    يحاول ترحيل القيد المحاسبي عبر المالية إن كانت مهيّأة (غير حاجب).
    """
    amt = Decimal(str(amount))
    pm = _resolve_bank_transfer_method(tenant_id)

    receipt_number = generate_unique_number(
        Receipt, tenant_id, f"RCP-ON-{timezone.now().strftime('%y%m%d')}-", 'receipt_number')
    receipt = Receipt.objects.create(
        tenant_id=tenant_id,
        student_billing_account=account,
        receipt_number=receipt_number,
        payment_date=date.today(),
        amount=amt,
        payment_method_id=pm.id,
        status='posted',
        created_by=user_id,
    )

    # تخصيص FIFO على المستحقات المفتوحة
    remaining = amt
    receivables = StudentReceivable.objects.filter(
        student_billing_account=account, status='outstanding'
    ).order_by('invoice__issue_date')
    for rec in receivables:
        if remaining <= 0:
            break
        allocate = min(remaining, rec.outstanding_amount)
        rec.paid_amount += allocate
        rec.outstanding_amount -= allocate
        if rec.outstanding_amount == 0:
            rec.status = 'paid'
        rec.save(update_fields=['paid_amount', 'outstanding_amount', 'status'])

        invoice = rec.invoice
        invoice.paid_amount += allocate
        invoice.outstanding_amount -= allocate
        invoice.save(update_fields=['paid_amount', 'outstanding_amount'])

        PaymentAllocation.objects.create(
            tenant_id=tenant_id, receivable=rec, receipt=receipt, amount_allocated=allocate,
        )
        remaining -= allocate

    # فائض السداد يذهب للرصيد الدائن
    if remaining > 0:
        account.credit_balance += remaining
    account.outstanding_balance = max(Decimal('0.0'), account.outstanding_balance - amt)
    account.current_balance = max(Decimal('0.0'), account.current_balance - amt)
    account.save(update_fields=['outstanding_balance', 'current_balance', 'credit_balance'])

    # محاولة الترحيل المحاسبي (best-effort — لا يحجب الاعتماد إن كانت المالية غير مهيّأة)
    try:
        _post_to_gl(tenant_id, account, receipt, amt, pm.id, user_id)
        req.posted_to_gl = True
    except Exception as e:
        logger.warning(f"تعذّر ترحيل القيد المحاسبي لطلب السداد {req.id} — سيُسجّل يدوياً: {e}")
        req.posted_to_gl = False

    return receipt


def _post_to_gl(tenant_id, account, receipt, amount, payment_method_id, user_id):
    """توليد سند قبض مرحّل في المالية (يتطلب تهيئة الإعدادات والسنة المالية)."""
    from apps.finance.domain.models import Voucher, ChartOfAccount, Currency
    from apps.finance.application.services import CashManagementService

    settings = StudentFinanceSettings.objects.filter(tenant_id=tenant_id).first()
    if not settings:
        raise ValidationError("الإعدادات المالية للطلاب غير مهيّأة.")

    base_currency = Currency.objects.filter(tenant_id=tenant_id, is_base=True).first()
    receivables_account = ChartOfAccount.objects.get(
        id=settings.receivables_gl_account_id, tenant_id=tenant_id
    )
    voucher = Voucher.objects.create(
        tenant_id=tenant_id,
        voucher_number=receipt.receipt_number,
        voucher_type='receipt',
        date=date.today(),
        amount=amount,
        currency=base_currency,
        gl_account=receivables_account,
        payment_method_id=payment_method_id,
        status='draft',
        created_by=user_id,
    )
    CashManagementService.process_voucher(tenant_id, voucher.id, user_id)
    receipt.voucher_id = voucher.id
    receipt.save(update_fields=['voucher_id'])


def _notify_parent(req, approved):
    """إشعار ولي الأمر عبر البريد (قالب نبراس) وإشعار داخل البوابة."""
    try:
        from apps.students.domain.models import Student
        student = Student.objects.filter(id=req.student_id).select_related('profile').first()
        student_name = getattr(getattr(student, 'profile', None), 'arabic_name', '') or 'الطالب'
    except Exception:
        student_name = 'الطالب'

    amount_txt = f"{req.amount:,.2f}"
    if approved:
        subject = "اعتماد سداد الرسوم - منصة نبراس التعليمية"
        body = (
            f"تم اعتماد سداد رسوم الطالب {student_name}.\n"
            f"المبلغ: {amount_txt}\n"
            f"الرقم المرجعي للتحويل: {req.transfer_reference}\n"
            f"تم تحديث حساب الطالب المالي بنجاح. شكراً لكم."
        )
    else:
        subject = "تعذّر اعتماد سداد الرسوم - منصة نبراس التعليمية"
        body = (
            f"نأسف، لم يُعتمد طلب سداد رسوم الطالب {student_name}.\n"
            f"المبلغ: {amount_txt}\n"
            f"الرقم المرجعي للتحويل: {req.transfer_reference}\n"
            f"السبب: {req.rejection_reason or '—'}\n"
            f"يمكنكم إعادة تقديم الطلب بعد التحقق من البيانات."
        )

    # إشعار داخل البوابة
    try:
        from apps.portal.domain.models import PortalUser, PortalNotification
        if req.submitted_by_user_id:
            pu = PortalUser.objects.filter(user_id=req.submitted_by_user_id).first()
            if pu:
                PortalNotification.objects.create(
                    tenant_id=req.tenant_id, portal_user=pu,
                    title=subject, body=body,
                    action_url='/portal/parent/payments',
                )
    except Exception as e:
        logger.warning(f"تعذّر إنشاء إشعار البوابة لطلب السداد {req.id}: {e}")

    # بريد إلكتروني
    try:
        from django.contrib.auth import get_user_model
        from apps.communications.application.services import CommunicationService
        from apps.communications.application.provisioning import ensure_communication_defaults

        User = get_user_model()
        user = User.objects.filter(id=req.submitted_by_user_id).first() if req.submitted_by_user_id else None
        if user and user.email:
            ensure_communication_defaults(req.tenant_id, created_by=req.reviewed_by)
            CommunicationService.send_message(
                tenant_id=req.tenant_id, channel_code='email',
                recipients=[{'type': 'to', 'entity_type': 'user', 'entity_id': user.id,
                             'name': user.get_full_name() or student_name, 'address': user.email}],
                subject=subject, body=body,
                priority='high', source_module='student_finance',
                source_event='online_payment_reviewed',
            )
    except Exception as e:
        logger.warning(f"تعذّر إرسال بريد إشعار السداد لطلب {req.id}: {e}")
