import logging
import math
from datetime import timedelta
from django.utils import timezone

from apps.communications.domain.models import (
    CommunicationQueue,
    CommunicationMessage,
    CommunicationRetry,
    CommunicationFailure,
    CommunicationLog,
)

logger = logging.getLogger('nebras.communications.queue')


# ============================================================
# إدارة الطابور — Queue Manager
# ============================================================
class QueueManager:
    """
    إدارة طابور الرسائل غير المتزامن.
    يدعم الأولوية والجدولة وإعادة المحاولة.
    """

    @classmethod
    def enqueue(cls, message, queue_type='standard', priority=5,
                scheduled_at=None, max_attempts=3):
        """إضافة رسالة للطابور."""
        queue_entry = CommunicationQueue.objects.create(
            tenant_id=message.tenant_id,
            message=message,
            queue_type=queue_type,
            status='queued',
            priority=priority,
            scheduled_at=scheduled_at,
            max_attempts=max_attempts,
        )
        return queue_entry

    @classmethod
    def dequeue(cls, tenant_id=None, batch_size=10):
        """
        استخراج دفعة من الرسائل الجاهزة للمعالجة من الطابور.
        تعطي الأولوية للرسائل ذات الأولوية الأعلى.
        """
        now = timezone.now()
        qs = CommunicationQueue.objects.filter(
            status='queued'
        ).filter(
            # إما غير مجدولة أو حان وقتها
            models_Q_scheduled_at_null=True
        ).select_related('message').order_by('priority', 'created_at')

        # استخدام raw filter لتجنب التعقيد
        from django.db.models import Q
        qs = CommunicationQueue.objects.filter(
            Q(status='queued') | Q(status='retry'),
            Q(scheduled_at__isnull=True) | Q(scheduled_at__lte=now),
            Q(next_retry_at__isnull=True) | Q(next_retry_at__lte=now),
        ).select_related('message').order_by('priority', 'created_at')

        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)

        return qs[:batch_size]

    @classmethod
    def mark_processing(cls, queue_entry, worker_id=None, celery_task_id=None):
        """تحديد إدخال الطابور كقيد المعالجة."""
        queue_entry.status = 'processing'
        queue_entry.started_at = timezone.now()
        queue_entry.worker_id = worker_id
        queue_entry.celery_task_id = celery_task_id
        queue_entry.save()

    @classmethod
    def mark_completed(cls, queue_entry):
        """تحديد إدخال الطابور كمكتمل."""
        queue_entry.status = 'completed'
        queue_entry.completed_at = timezone.now()
        queue_entry.save()

    @classmethod
    def mark_failed(cls, queue_entry, error_message=''):
        """
        تحديد إدخال الطابور كفاشل.
        يتم تحديد ما إذا كان يجب إعادة المحاولة أو نقله للطابور الميت.
        """
        queue_entry.attempt_count += 1
        queue_entry.error_message = error_message

        if queue_entry.attempt_count >= queue_entry.max_attempts:
            queue_entry.status = 'dead_letter'
            logger.warning(f"[Queue] نقل الرسالة {queue_entry.message_id} إلى Dead Letter Queue")
        else:
            # حساب وقت إعادة المحاولة التالية
            delay = RetryPolicy.calculate_delay(queue_entry.attempt_count)
            queue_entry.status = 'retry'
            queue_entry.next_retry_at = timezone.now() + timedelta(seconds=delay)

        queue_entry.save()

    @classmethod
    def move_to_dead_letter(cls, queue_entry):
        """نقل إدخال إلى طابور الرسائل الميتة."""
        queue_entry.status = 'dead_letter'
        queue_entry.save()

    @classmethod
    def purge_queue(cls, tenant_id, status='dead_letter'):
        """مسح الطابور من رسائل بحالة معينة."""
        count = CommunicationQueue.objects.filter(
            tenant_id=tenant_id, status=status
        ).delete()[0]
        return count

    @classmethod
    def get_queue_stats(cls, tenant_id):
        """الحصول على إحصائيات الطابور."""
        from django.db.models import Count, Q
        qs = CommunicationQueue.objects.filter(tenant_id=tenant_id)
        return {
            'queued': qs.filter(status='queued').count(),
            'processing': qs.filter(status='processing').count(),
            'completed': qs.filter(status='completed').count(),
            'failed': qs.filter(status='failed').count(),
            'retry': qs.filter(status='retry').count(),
            'dead_letter': qs.filter(status='dead_letter').count(),
            'cancelled': qs.filter(status='cancelled').count(),
        }


# ============================================================
# سياسة إعادة المحاولة — Retry Policy
# ============================================================
class RetryPolicy:
    """
    سياسة إعادة المحاولة مع تأخير أسي (Exponential Backoff).
    """

    # الإعدادات الافتراضية
    BASE_DELAY = 60        # التأخير الأساسي بالثواني (دقيقة واحدة)
    MAX_DELAY = 3600       # الحد الأقصى للتأخير (ساعة واحدة)
    BACKOFF_FACTOR = 2     # عامل المضاعفة
    MAX_RETRIES = 5        # الحد الأقصى لعدد المحاولات
    JITTER = True          # إضافة عشوائية لتجنب التكدس

    @classmethod
    def calculate_delay(cls, attempt_number, base_delay=None, max_delay=None,
                        backoff_factor=None):
        """
        حساب التأخير قبل إعادة المحاولة.
        التأخير = min(base_delay * (backoff_factor ^ attempt), max_delay)
        """
        base = base_delay or cls.BASE_DELAY
        maximum = max_delay or cls.MAX_DELAY
        factor = backoff_factor or cls.BACKOFF_FACTOR

        delay = min(base * (factor ** attempt_number), maximum)

        if cls.JITTER:
            import random
            jitter = random.uniform(0, delay * 0.1)
            delay += jitter

        return int(delay)

    @classmethod
    def should_retry(cls, failure_type, attempt_count, max_retries=None):
        """
        تحديد ما إذا كان يجب إعادة المحاولة.
        """
        max_r = max_retries or cls.MAX_RETRIES

        # الأخطاء الدائمة لا يتم إعادة محاولتها
        permanent_failures = ['permanent', 'invalid_recipient', 'authentication']
        if failure_type in permanent_failures:
            return False

        return attempt_count < max_r

    @classmethod
    def create_retry(cls, tenant_id, message, attempt_number, error_message='',
                     provider_response=None, is_manual=False, triggered_by=None):
        """
        إنشاء سجل إعادة محاولة.
        """
        delay = cls.calculate_delay(attempt_number) if not is_manual else 0

        retry = CommunicationRetry.objects.create(
            tenant_id=tenant_id,
            message=message,
            attempt_number=attempt_number,
            status='pending',
            scheduled_at=timezone.now() + timedelta(seconds=delay),
            delay_seconds=delay,
            error_message=error_message,
            provider_response=provider_response or {},
            is_manual=is_manual,
            triggered_by=triggered_by,
        )

        CommunicationLog.objects.create(
            tenant_id=tenant_id,
            message=message,
            level='info',
            action='retry_scheduled',
            description=f"تم جدولة إعادة المحاولة #{attempt_number} — التأخير: {delay} ثانية",
            details={
                'attempt_number': attempt_number,
                'delay_seconds': delay,
                'is_manual': is_manual,
            },
        )

        return retry

    @classmethod
    def record_failure(cls, tenant_id, message, failure_type, error_code=None,
                       error_message='', provider_response=None, stack_trace=None):
        """
        تسجيل حالة فشل.
        """
        failure = CommunicationFailure.objects.create(
            tenant_id=tenant_id,
            message=message,
            failure_type=failure_type,
            error_code=error_code,
            error_message=error_message,
            provider_response=provider_response or {},
            stack_trace=stack_trace,
        )

        CommunicationLog.objects.create(
            tenant_id=tenant_id,
            message=message,
            level='error',
            action='message_failed',
            description=f"فشل الإرسال: {failure_type} — {error_message[:200]}",
            details={
                'failure_type': failure_type,
                'error_code': error_code,
            },
        )

        return failure


# ============================================================
# طابور الرسائل الميتة — Dead Letter Queue
# ============================================================
class DeadLetterQueue:
    """
    إدارة الرسائل التي استنفدت جميع محاولات إعادة الإرسال.
    """

    @classmethod
    def get_dead_letters(cls, tenant_id, limit=50):
        """الحصول على الرسائل في طابور الرسائل الميتة."""
        return CommunicationQueue.objects.filter(
            tenant_id=tenant_id, status='dead_letter'
        ).select_related('message').order_by('-created_at')[:limit]

    @classmethod
    def retry_dead_letter(cls, tenant_id, queue_entry_id, retried_by=None):
        """إعادة محاولة رسالة من طابور الرسائل الميتة."""
        entry = CommunicationQueue.objects.get(
            id=queue_entry_id, tenant_id=tenant_id, status='dead_letter'
        )
        entry.status = 'queued'
        entry.attempt_count = 0
        entry.error_message = None
        entry.next_retry_at = None
        entry.save()

        # إنشاء سجل إعادة محاولة يدوية
        RetryPolicy.create_retry(
            tenant_id=tenant_id,
            message=entry.message,
            attempt_number=entry.message.retry_count + 1,
            is_manual=True,
            triggered_by=retried_by,
        )

        # إطلاق مهمة Celery
        try:
            from apps.communications.infrastructure.celery_tasks import send_message_task
            send_message_task.delay(str(entry.message_id))
        except Exception as e:
            logger.warning(f"فشل إطلاق مهمة لإعادة المحاولة: {e}")

        return entry

    @classmethod
    def get_dead_letter_count(cls, tenant_id):
        """عدد الرسائل في طابور الرسائل الميتة."""
        return CommunicationQueue.objects.filter(
            tenant_id=tenant_id, status='dead_letter'
        ).count()
