"""خدمات فوترة المنصّة: توليد الفواتير، تسجيل المدفوعات، ومؤشرات الإيراد."""
from __future__ import annotations
from dataclasses import dataclass
from decimal import Decimal
from datetime import date, timedelta

from django.db import transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone

from apps.saas_billing.domain.models import (
    SubscriptionPlan, TenantSubscription, Invoice, InvoiceLineItem, Payment,
    BillingCycle, SubscriptionStatus, InvoiceStatus,
)

_CYCLE_DAYS = {
    BillingCycle.MONTHLY: 30,
    BillingCycle.QUARTERLY: 91,
    BillingCycle.ANNUAL: 365,
}


def _period_end(start: date, cycle: str) -> date:
    return start + timedelta(days=_CYCLE_DAYS.get(cycle, 365))


def next_invoice_number() -> str:
    """رقم فاتورة تسلسلي: INV-YYYY-NNNNN."""
    year = timezone.now().year
    prefix = f'INV-{year}-'
    last = (Invoice.objects.filter(number__startswith=prefix)
            .order_by('-number').values_list('number', flat=True).first())
    seq = int(last.split('-')[-1]) + 1 if last else 1
    return f'{prefix}{seq:05d}'


@transaction.atomic
def create_subscription(*, tenant_id, plan: SubscriptionPlan, trial_days: int = 0,
                        start: date | None = None) -> TenantSubscription:
    """ينشئ اشتراكاً لمستأجر على خطة، مع فترة تجريبية اختيارية."""
    start = start or timezone.now().date()
    period_end = _period_end(start, plan.billing_cycle)
    status = SubscriptionStatus.TRIAL if trial_days > 0 else SubscriptionStatus.ACTIVE
    trial_end = start + timedelta(days=trial_days) if trial_days > 0 else None
    return TenantSubscription.objects.create(
        tenant_id=tenant_id, plan=plan, status=status,
        started_at=start, current_period_start=start, current_period_end=period_end,
        trial_ends_at=trial_end,
    )


@transaction.atomic
def generate_invoice_for_subscription(subscription: TenantSubscription, *,
                                      issue: date | None = None,
                                      due_in_days: int = 14) -> Invoice:
    """يولّد فاتورة لدورة الاشتراك الحالية بسطر واحد يمثّل رسم الخطة."""
    plan = subscription.plan
    issue = issue or timezone.now().date()
    period_start = subscription.current_period_start or issue
    period_end = subscription.current_period_end or _period_end(period_start, plan.billing_cycle)

    invoice = Invoice.objects.create(
        tenant_id=subscription.tenant_id,
        subscription=subscription,
        number=next_invoice_number(),
        status=InvoiceStatus.OPEN,
        issue_date=issue,
        due_date=issue + timedelta(days=due_in_days),
        period_start=period_start,
        period_end=period_end,
        currency=plan.currency,
    )
    cycle_label = dict(BillingCycle.choices).get(plan.billing_cycle, '')
    InvoiceLineItem.objects.create(
        invoice=invoice,
        description=f'اشتراك «{plan.name_ar}» — {cycle_label}',
        quantity=Decimal('1.00'),
        unit_price=plan.price,
        amount=plan.price,
    )
    recalc_invoice_totals(invoice)
    return invoice


def recalc_invoice_totals(invoice: Invoice) -> Invoice:
    """يعيد حساب المجاميع من بنود الفاتورة والمدفوعات ويحدّث الحالة."""
    subtotal = invoice.line_items.aggregate(s=Sum('amount'))['s'] or Decimal('0')
    invoice.subtotal = subtotal
    invoice.total = subtotal - (invoice.discount_amount or 0) + (invoice.tax_amount or 0)
    paid = invoice.payments.aggregate(s=Sum('amount'))['s'] or Decimal('0')
    invoice.amount_paid = paid

    if invoice.status != InvoiceStatus.VOID:
        if paid >= invoice.total and invoice.total > 0:
            invoice.status = InvoiceStatus.PAID
        elif invoice.due_date and invoice.due_date < timezone.now().date() and paid < invoice.total:
            invoice.status = InvoiceStatus.OVERDUE
        elif invoice.status == InvoiceStatus.DRAFT:
            pass
        else:
            invoice.status = InvoiceStatus.OPEN
    invoice.save()
    return invoice


@transaction.atomic
def record_payment(*, invoice: Invoice, amount: Decimal, method: str,
                   reference: str | None = None, recorded_by=None,
                   paid_at=None) -> Payment:
    """يسجّل دفعة على فاتورة ويحدّث حالتها؛ ويفعّل الاشتراك إن كان متأخراً."""
    payment = Payment.objects.create(
        tenant_id=invoice.tenant_id, invoice=invoice, amount=amount, method=method,
        reference=reference, recorded_by=recorded_by, paid_at=paid_at or timezone.now(),
    )
    recalc_invoice_totals(invoice)

    sub = invoice.subscription
    if sub and invoice.status == InvoiceStatus.PAID and sub.status in (
            SubscriptionStatus.PAST_DUE, SubscriptionStatus.SUSPENDED, SubscriptionStatus.TRIAL):
        sub.status = SubscriptionStatus.ACTIVE
        sub.save(update_fields=['status', 'updated_at'])
    return payment


def sync_overdue_invoices() -> int:
    """يحدّث الفواتير المستحقة التي تجاوزت تاريخ الاستحقاق إلى «متأخرة»."""
    today = timezone.now().date()
    qs = Invoice.objects.filter(status=InvoiceStatus.OPEN, due_date__lt=today)
    count = 0
    for inv in qs:
        if inv.amount_paid < inv.total:
            inv.status = InvoiceStatus.OVERDUE
            inv.save(update_fields=['status', 'updated_at'])
            count += 1
    return count


@dataclass
class BillingMetrics:
    active_subscriptions: int
    trial_subscriptions: int
    mrr: Decimal            # الإيراد الشهري المتكرّر
    outstanding: Decimal    # إجمالي المستحقّات غير المدفوعة
    collected_this_year: Decimal
    overdue_invoices: int


def compute_metrics() -> BillingMetrics:
    """مؤشرات لوحة الفوترة على مستوى المنصّة."""
    active = TenantSubscription.objects.filter(status=SubscriptionStatus.ACTIVE)
    trial = TenantSubscription.objects.filter(status=SubscriptionStatus.TRIAL).count()

    # MRR: طبّع سعر كل خطة نشطة إلى قيمة شهرية
    mrr = Decimal('0')
    for sub in active.select_related('plan'):
        p = sub.plan
        days = _CYCLE_DAYS.get(p.billing_cycle, 365)
        mrr += (p.price or Decimal('0')) * Decimal('30') / Decimal(days)

    open_invoices = Invoice.objects.filter(status__in=[InvoiceStatus.OPEN, InvoiceStatus.OVERDUE])
    outstanding = sum((inv.total - inv.amount_paid for inv in open_invoices), Decimal('0'))

    year = timezone.now().year
    collected = (Payment.objects.filter(paid_at__year=year)
                 .aggregate(s=Sum('amount'))['s'] or Decimal('0'))
    overdue = Invoice.objects.filter(status=InvoiceStatus.OVERDUE).count()

    return BillingMetrics(
        active_subscriptions=active.count(),
        trial_subscriptions=trial,
        mrr=mrr.quantize(Decimal('0.01')),
        outstanding=Decimal(outstanding).quantize(Decimal('0.01')),
        collected_this_year=Decimal(collected).quantize(Decimal('0.01')),
        overdue_invoices=overdue,
    )
