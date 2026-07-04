import logging
from celery import shared_task
from django.utils import timezone
from decimal import Decimal

from apps.student_finance.domain.models import (
    StudentBillingAccount, StudentReceivable, LateFeeRule, CollectionPolicy, FeeStructure
)
from apps.student_finance.application.services import BillingService, HoldService

logger = logging.getLogger('nebras.student_finance.tasks')


@shared_task
def run_bulk_billing_cycle(tenant_id, fee_structure_ids, student_ids, due_date_str):
    """
    مهمة خلفية (Celery) لفوترة الطلاب دفعياً (Bulk Invoicing) في بداية الفصول الدراسية.
    """
    logger.info(f"Starting bulk billing cycle for tenant {tenant_id} and {len(student_ids)} students.")
    
    fee_structures = FeeStructure.objects.filter(id__in=fee_structure_ids, tenant_id=tenant_id)
    due_date = timezone.datetime.strptime(due_date_str, '%Y-%m-%d').date()

    success_count = 0
    error_count = 0

    for stud_id in student_ids:
        try:
            account, _ = StudentBillingAccount.objects.get_or_create(
                tenant_id=tenant_id,
                student_id=stud_id,
                defaults={
                    'account_number': f"ACC-ST-{timezone.now().strftime('%y%m%d%H%M%S')}-{stud_id[:8]}"
                }
            )
            BillingService.generate_student_invoice(
                tenant_id=tenant_id,
                billing_account_id=account.id,
                fee_structures=fee_structures,
                due_date=due_date
            )
            success_count += 1
        except Exception as e:
            logger.error(f"Error billing student {stud_id}: {str(e)}")
            error_count += 1

    logger.info(f"Bulk billing completed. Success: {success_count}, Errors: {error_count}")
    return {'success_count': success_count, 'error_count': error_count}


@shared_task
def apply_late_fee_charges_job(tenant_id):
    """
    مهمة دورية لفحص الديون المتأخرة وتطبيق الغرامات المالية للطلاب تلقائياً.
    """
    logger.info(f"Running late fee calculation job for tenant {tenant_id}")
    today = timezone.localdate()
    
    active_rules = LateFeeRule.objects.filter(tenant_id=tenant_id)
    if not active_rules.exists():
        return "No late fee rules configured."

    overdue_receivables = StudentReceivable.objects.filter(
        tenant_id=tenant_id,
        status='outstanding',
        invoice__due_date__lt=today
    )

    applied_count = 0
    for rec in overdue_receivables:
        # حساب فارق الأيام
        days_late = (today - rec.invoice.due_date).days
        
        # البحث عن القواعد المناسبة
        for rule in active_rules:
            if days_late >= rule.grace_period_days:
                # احتساب الغرامة
                if rule.charge_type == 'fixed':
                    fee_amount = Decimal(str(rule.charge_amount))
                else:
                    fee_amount = rec.outstanding_amount * (Decimal(str(rule.charge_amount)) / Decimal('100.0'))

                if fee_amount > 0:
                    # تحديث المستحق وتراكم المديونية
                    rec.outstanding_amount += fee_amount
                    rec.amount += fee_amount
                    rec.save(update_fields=['outstanding_amount', 'amount'])
                    
                    # تحديث الحساب
                    account = rec.student_billing_account
                    account.outstanding_balance += fee_amount
                    account.current_balance += fee_amount
                    account.save(update_fields=['outstanding_balance', 'current_balance'])
                    applied_count += 1

    return f"Applied late fees to {applied_count} receivables."


@shared_task
def check_overdue_and_apply_holds_job(tenant_id):
    """
    مهمة لفحص المتأخرين وفرض حظر مالي تلقائي للطلاب الذين تجاوزوا شروط التحصيل.
    """
    logger.info(f"Checking overdue accounts for collection policy holds for tenant {tenant_id}")
    today = timezone.localdate()

    policies = CollectionPolicy.objects.filter(tenant_id=tenant_id, action_required='hold')
    if not policies.exists():
        return "No hold policies configured."

    for policy in policies:
        overdue_receivables = StudentReceivable.objects.filter(
            tenant_id=tenant_id,
            status='outstanding',
            invoice__due_date__lt=today - timezone.timedelta(days=policy.days_overdue),
            student_billing_account__financial_hold=False
        )

        for rec in overdue_receivables:
            HoldService.apply_financial_hold(
                tenant_id=tenant_id,
                billing_account_id=rec.student_billing_account.id,
                hold_type='registration',
                reason=f"حظر تلقائي لتجاوز موعد استحقاق الفاتورة {rec.invoice.invoice_number} لأكثر من {policy.days_overdue} يوم."
            )
            
    return "Overdue check completed."
