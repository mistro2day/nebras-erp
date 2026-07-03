from datetime import date, time
from django.test import TestCase
from apps.scheduling.domain.models import (
    Schedule,
    ScheduleResource,
    ScheduleEvent,
    Reservation,
    ScheduleHoliday,
    ScheduleConflict
)
from apps.scheduling.application.services import ConflictDetectionService, ReservationService
import uuid


class SchedulingEngineConflictTests(TestCase):
    """
    اختبارات محرك كشف التعارضات والأعمال البرمجية الخاصة بالجدولة
    """

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        
        # إنشاء مورد عام (غرفة دراسية مثلاً)
        self.room = ScheduleResource.objects.create(
            tenant_id=self.tenant_id,
            name='قاعة الحاسب الآلي 101',
            resource_type='laboratory',
            capacity=30
        )
        
        # إنشاء جدول
        self.schedule = Schedule.objects.create(
            tenant_id=self.tenant_id,
            name='جدول الفصل الأول',
            code='SCH-T1-2026',
            schedule_type='academic',
            version=1,
            status='published'
        )

    def test_no_conflict_when_empty(self):
        """التحقق من عدم وجود أي تداخل في بيئة خالية"""
        conflicts = ConflictDetectionService.detect_conflicts_for_resource(
            resource_id=self.room.id,
            date_val=date(2026, 9, 1),
            start_time=time(8, 0),
            end_time=time(9, 30)
        )
        self.assertEqual(len(conflicts), 0)

    def test_detect_double_booking_conflict(self):
        """التحقق من كشف التعارض عند وجود فعالية أخرى متداخلة زمنياً لنفس المورد"""
        # حجز المورد مسبقاً بفعالية
        ScheduleEvent.objects.create(
            tenant_id=self.tenant_id,
            schedule=self.schedule,
            title='مادة قواعد البيانات',
            start_date=date(2026, 9, 1),
            end_date=date(2026, 9, 1),
            start_time=time(8, 0),
            end_time=time(9, 30),
            resource=self.room
        )

        # محاولة فحص التعارض في فترة متداخلة (مثلاً 9:00 إلى 10:00)
        conflicts = ConflictDetectionService.detect_conflicts_for_resource(
            resource_id=self.room.id,
            date_val=date(2026, 9, 1),
            start_time=time(9, 0),
            end_time=time(10, 0)
        )
        self.assertTrue(len(conflicts) > 0)
        self.assertEqual(conflicts[0]['conflict_type'], 'resource_double_booking')

    def test_detect_holiday_conflict(self):
        """التحقق من كشف التعارض إذا كان اليوم المحدد إجازة رسمية"""
        ScheduleHoliday.objects.create(
            tenant_id=self.tenant_id,
            name='اليوم الوطني السعودي',
            start_date=date(2026, 9, 23),
            end_date=date(2026, 9, 23)
        )

        conflicts = ConflictDetectionService.detect_conflicts_for_resource(
            resource_id=self.room.id,
            date_val=date(2026, 9, 23),
            start_time=time(9, 0),
            end_time=time(10, 0)
        )
        self.assertTrue(len(conflicts) > 0)
        self.assertEqual(conflicts[0]['conflict_type'], 'holiday_conflict')