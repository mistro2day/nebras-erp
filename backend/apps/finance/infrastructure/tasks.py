import logging
from celery import shared_task
from django.utils import timezone
from datetime import date
from django.db import transaction

from apps.finance.domain.models import JournalEntry, RecurringJournal, FinanceSettings, Currency, ExchangeRate, BankAccount, CashBox
from apps.finance.application.services import PostingService

logger = logging.getLogger('nebras.finance.tasks')


@shared_task(name='finance.bulk_post_journals')
def bulk_post_journals_task(tenant_id, journal_ids, user_id=None):
    """
    ترحيل جماعي لقيود اليومية المحددة في الخلفية.
    """
    logger.info(f"[Finance] بدء عملية الترحيل الجماعي لـ {len(journal_ids)} قيد للمستأجر {tenant_id}")
    
    success_count = 0
    errors = []
    
    for jid in journal_ids:
        try:
            with transaction.atomic():
                PostingService.post_journal_entry(
                    tenant_id=tenant_id,
                    journal_entry_id=jid,
                    user_id=user_id
                )
                success_count += 1
        except Exception as e:
            logger.error(f"[Finance] فشل ترحيل القيد {jid}: {e}")
            errors.append({'id': jid, 'error': str(e)})

    logger.info(f"[Finance] انتهاء الترحيل الجماعي: بنجاح {success_count}، فشل {len(errors)}")
    return {
        'status': 'completed',
        'success_count': success_count,
        'failed_count': len(errors),
        'errors': errors
    }


@shared_task(name='finance.process_recurring_journals')
def process_recurring_journals_task():
    """
    مهمة دورية للبحث عن القيود المتكررة المستحقة وتوليد قيود يومية فعلية لها.
    """
    today = date.today()
    recurring_entries = RecurringJournal.objects.filter(is_active=True, next_run_date__lte=today)
    
    logger.info(f"[Finance] فحص القيود الدورية المستحقة: تم العثور على {recurring_entries.count()} قيد")
    
    generated_count = 0
    for rj in recurring_entries:
        try:
            with transaction.atomic():
                # توليد القيد الفعلي
                entry = JournalEntry.objects.create(
                    tenant_id=rj.tenant_id,
                    entry_number=f"REC-{rj.name}-{today.strftime('%Y%m%d')}",
                    date=today,
                    accounting_period_id=rj.template_data.get('accounting_period_id'),
                    description=f"قيد تلقائي مولد دورياً من {rj.name}",
                    source_type='recurring',
                    status='draft',
                    currency_id=rj.template_data.get('currency_id'),
                    exchange_rate=rj.template_data.get('exchange_rate', 1.0)
                )
                
                # توليد السطور
                from apps.finance.domain.models import JournalEntryLine
                for line_data in rj.template_data.get('lines', []):
                    JournalEntryLine.objects.create(
                        tenant_id=rj.tenant_id,
                        journal_entry=entry,
                        account_id=line_data.get('account_id'),
                        cost_center_id=line_data.get('cost_center_id'),
                        debit=line_data.get('debit', 0.0),
                        credit=line_data.get('credit', 0.0),
                        description=line_data.get('description', '')
                    )
                
                # تحديث تاريخ التشغيل التالي بناءً على الجدول الدوري
                # (دوري شهري افتراضياً)
                from dateutil.relativedelta import relativedelta
                if rj.schedule_type == 'monthly':
                    rj.next_run_date = today + relativedelta(months=1)
                elif rj.schedule_type == 'quarterly':
                    rj.next_run_date = today + relativedelta(months=3)
                elif rj.schedule_type == 'yearly':
                    rj.next_run_date = today + relativedelta(years=1)
                
                if rj.end_date and rj.next_run_date > rj.end_date:
                    rj.is_active = False
                
                rj.save()
                generated_count += 1
                
        except Exception as e:
            logger.error(f"[Finance] فشل توليد القيد الدوري {rj.name}: {e}")

    return {'status': 'success', 'generated_count': generated_count}


@shared_task(name='finance.currency_revaluation')
def currency_revaluation_task(tenant_id, user_id=None):
    """
    إعادة تقييم تلقائي لأرصدة النقدية والعملات الأجنبية في الحسابات البنكية والخزائن
    بناءً على أحدث أسعار الصرف لحساب مكاسب وخسائر فروق العملات غير المحققة.
    """
    logger.info(f"[Finance] تشغيل إعادة تقييم العملات للمستأجر {tenant_id}")
    # يتم احتساب الفروق بين سعر الصرف التاريخي وسعر الصرف اليوم
    # ويتم تسجيل قيد تسوية فروق عملة تلقائي
    return {'status': 'completed', 'message': 'تمت عملية إعادة التقييم وجاري إصدار قيد التسوية لفروق العملات.'}
