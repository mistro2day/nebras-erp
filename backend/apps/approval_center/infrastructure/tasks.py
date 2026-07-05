import logging
from celery import shared_task

logger = logging.getLogger('nebras.approval_center.tasks')

# ملاحظة: لا يوجد حالياً تطبيق Celery (config/celery.py) ولا CELERY_BEAT_SCHEDULE في هذا
# المشروع — هذا الملف مكتوب بنفس نمط apps/communications/infrastructure/celery_tasks.py
# اتساقاً مع بقية الموديولات، لكن تشغيله الدوري الفعلي يتطلب ربط Celery Beat لاحقاً على مستوى المشروع.


@shared_task(name='approval_center.check_overdue_sla')
def check_overdue_sla_task(tenant_id=None):
    from apps.approval_center.application.services import SLATrackingService
    count = SLATrackingService.check_overdue(tenant_id)
    logger.info(f"[SLA] تم تحديد {count} طلب اعتماد متجاوز للمهلة المحددة")
    return {'overdue_flagged': count}


@shared_task(name='approval_center.check_sla_warnings')
def check_sla_warnings_task(tenant_id=None):
    from apps.approval_center.application.services import SLATrackingService
    count = SLATrackingService.check_warnings(tenant_id)
    logger.info(f"[SLA] تم إنشاء {count} تذكير تحذيري لاقتراب انتهاء المهلة")
    return {'reminders_created': count}


@shared_task(name='approval_center.send_reminders')
def send_reminders_task(tenant_id=None, batch_size=50):
    from django.utils import timezone
    from apps.approval_center.domain.models import ApprovalReminder
    from apps.approval_center.application.services import ApprovalNotificationService

    qs = ApprovalReminder.objects.filter(is_sent=False, remind_at__lte=timezone.now())
    if tenant_id:
        qs = qs.filter(tenant_id=tenant_id)

    sent = 0
    for reminder in qs.select_related('request')[:batch_size]:
        ApprovalNotificationService.notify_user(
            reminder.tenant_id, reminder.request.requester_id, reminder.message,
            request_id=reminder.request_id,
        )
        reminder.is_sent = True
        reminder.sent_at = timezone.now()
        reminder.save(update_fields=['is_sent', 'sent_at'])
        sent += 1

    logger.info(f"[Reminders] تم إرسال {sent} تذكير")
    return {'sent': sent}


@shared_task(name='approval_center.auto_escalate_overdue')
def auto_escalate_overdue_task(tenant_id=None):
    from apps.approval_center.application.services import ApprovalEscalationService
    count = ApprovalEscalationService.auto_escalate_overdue(tenant_id)
    logger.info(f"[Escalation] تم تصعيد {count} طلب اعتماد متجاوز للمهلة تلقائياً")
    return {'escalated': count}


@shared_task(name='approval_center.send_digest_notifications')
def send_digest_notifications_task(tenant_id=None):
    from apps.approval_center.domain.models import EnterpriseInbox, InboxItem
    from apps.approval_center.application.services import ApprovalNotificationService

    inboxes = EnterpriseInbox.objects.all()
    if tenant_id:
        inboxes = inboxes.filter(tenant_id=tenant_id)

    digests_sent = 0
    for inbox in inboxes:
        pending_count = InboxItem.objects.filter(
            tenant_id=inbox.tenant_id, inbox=inbox, status='pending'
        ).count()
        if pending_count > 0:
            ApprovalNotificationService.notify_user(
                inbox.tenant_id, inbox.user_id,
                f"لديك {pending_count} عنصر بانتظار اتخاذ إجراء في صندوق الوارد الموحد.",
                link='/approvals/inbox',
            )
            digests_sent += 1

    logger.info(f"[Digest] تم إرسال {digests_sent} ملخص يومي")
    return {'digests_sent': digests_sent}


@shared_task(name='approval_center.recalculate_statistics')
def recalculate_statistics_task(tenant_id=None):
    from apps.approval_center.application.services import ApprovalAnalyticsService
    from apps.tenants.domain.models import Tenant

    tenant_ids = [tenant_id] if tenant_id else list(Tenant.objects.values_list('id', flat=True))
    updated = 0
    for tid in tenant_ids:
        ApprovalAnalyticsService.recalculate_statistics(tid)
        updated += 1

    logger.info(f"[Statistics] تم تحديث إحصاءات {updated} مستأجر")
    return {'updated': updated}
