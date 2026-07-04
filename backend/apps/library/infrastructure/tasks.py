from celery import shared_task
from django.utils import timezone
from decimal import Decimal
from apps.library.domain.models import BorrowTransaction, LibrarySettings, LibraryStatistics, Fine
from apps.library.application.services import FineService
from apps.tenant.models import Tenant

@shared_task
def apply_daily_overdue_fines():
    """
    مهمة يومية لفحص الكتب المتأخرة وتطبيق غرامات التأخير اليومية على المستعيرين المتخلفين عن الإرجاع.
    """
    today = timezone.now().date()
    tenants = Tenant.objects.all()
    
    total_fines_posted = 0
    for tenant in tenants:
        overdue_txs = BorrowTransaction.objects.filter(
            tenant_id=tenant.id,
            status__in=['borrowed', 'overdue'],
            due_date__lt=today
        )

        settings = LibrarySettings.objects.filter(tenant_id=tenant.id).first()
        fine_rate = settings.fine_per_day if settings else Decimal('1.00')

        # حساب الحسابات الافتراضية للغرامات للتكامل
        # هنا نفترض حساب ذمم طلاب وحساب إيرادات غرامات
        # في بيئة الإنتاج، يتم جلبها من إعدادات المكتبة
        from apps.finance.domain.models import ChartOfAccount
        debit_acc = ChartOfAccount.objects.filter(tenant_id=tenant.id, code__startswith='1').first()
        credit_acc = ChartOfAccount.objects.filter(tenant_id=tenant.id, code__startswith='4').first()

        for tx in overdue_txs:
            # 1. تحديث الحالة
            if tx.status == 'borrowed':
                tx.status = 'overdue'
                tx.save()

            # 2. احتساب الغرامة لليوم الإضافي المنقضي
            delta = today - tx.due_date
            days_overdue = delta.days

            if debit_acc and credit_acc:
                # تحديث أو إصدار غرامة اليوم
                FineService.calculate_and_post_fine(
                    tenant_id=tenant.id,
                    borrow_transaction_id=tx.id,
                    days_overdue=days_overdue,
                    fine_per_day=fine_rate,
                    debit_gl_account_id=debit_acc.id,
                    credit_gl_account_id=credit_acc.id
                )
                total_fines_posted += 1

    return {
        'run_date': str(today),
        'fines_issued_count': total_fines_posted
    }
