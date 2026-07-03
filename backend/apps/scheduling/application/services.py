from datetime import datetime, time
from django.utils import timezone
from apps.scheduling.domain.models import (
    ScheduleEvent,
    Reservation,
    ScheduleConflict,
    ScheduleResource,
    ScheduleHoliday
)

class ConflictDetectionService:
    """
    محرك كشف التعارضات الرئيسي (Conflict Detection Engine)
    يتعامل مع تداخل الحجوزات والفعاليات وقدرة استيعاب الموارد ومقاطعة الإجازات والعطلات الرسمية.
    """

    @classmethod
    def detect_conflicts_for_resource(cls, resource_id, date_val, start_time, end_time, exclude_event_id=None, exclude_reservation_id=None):
        """
        التحقق من وجود تداخلات أو تعارضات لنفس المورد في فترة زمنية محددة.
        """
        conflicts = []

        # 1. التداخل مع الفعاليات الحالية (Events)
        overlapping_events = ScheduleEvent.objects.filter(
            resource_id=resource_id,
            start_date__lte=date_val,
            end_date__gte=date_val,
            start_time__lt=end_time,
            end_time__gt=start_time,
            deleted_at__isnull=True
        )
        if exclude_event_id:
            overlapping_events = overlapping_events.exclude(id=exclude_event_id)

        for ev in overlapping_events:
            conflicts.append({
                'conflict_type': 'resource_double_booking',
                'description': f"المورد محجوز مسبقاً في الفعالية: {ev.title} ({ev.start_time} - {ev.end_time})"
            })

        # 2. التداخل مع الحجوزات المعتمدة (Reservations)
        overlapping_reservations = Reservation.objects.filter(
            resource_id=resource_id,
            date=date_val,
            start_time__lt=end_time,
            end_time__gt=start_time,
            status__in=['reserved', 'approved'],
            deleted_at__isnull=True
        )
        if exclude_reservation_id:
            overlapping_reservations = overlapping_reservations.exclude(id=exclude_reservation_id)

        for res in overlapping_reservations:
            conflicts.append({
                'conflict_type': 'reservation_conflict',
                'description': f"المورد محجوز لغرض: {res.title} ({res.start_time} - {res.end_time})"
            })

        # 3. التحقق من التداخل مع العطلات والإجازات الرسمية
        holidays = ScheduleHoliday.objects.filter(
            start_date__lte=date_val,
            end_date__gte=date_val,
            deleted_at__isnull=True
        )
        for hol in holidays:
            conflicts.append({
                'conflict_type': 'holiday_conflict',
                'description': f"اليوم المحدد يقع ضمن عطلة رسمية: {hol.name}"
            })

        return conflicts


class ReservationService:
    """
    خدمات إدارة ومعالجة الحجوزات ودورة حياتها.
    """

    @classmethod
    def create_reservation(cls, tenant_id, resource_id, title, date_val, start_time, end_time, reserved_by, purpose=None):
        """
        إنشاء حجز جديد مع الكشف التلقائي عن أي تعارضات زمنية أو تعارض موارد.
        """
        # التحقق من وجود تعارضات
        conflicts = ConflictDetectionService.detect_conflicts_for_resource(
            resource_id=resource_id,
            date_val=date_val,
            start_time=start_time,
            end_time=end_time
        )

        # في حال وجود تعارض، نقوم بتسجيل التعارض وحفظ الحجز كمسودة/مرفوض تلقائياً
        status = 'reserved' if not conflicts else 'draft'

        reservation = Reservation.objects.create(
            tenant_id=tenant_id,
            resource_id=resource_id,
            title=title,
            date=date_val,
            start_time=start_time,
            end_time=end_time,
            reserved_by=reserved_by,
            purpose=purpose,
            status=status
        )

        # تسجيل التعارضات المكتشفة في لوحة التعارضات
        for conf in conflicts:
            ScheduleConflict.objects.create(
                tenant_id=tenant_id,
                severity='high',
                conflict_type=conf['conflict_type'],
                description=f"حجز [{title}]: {conf['description']}"
            )

        return reservation, conflicts