"""
اختبارات نموذج إدارة الحضور والغياب
Nebras ERP — Attendance & Time Management
"""
from datetime import date, time
from django.test import TestCase
from apps.employees.domain.models import Employee
from apps.attendance.domain.models import (
    AttendanceRecord,
    AttendancePolicy,
    WorkShift,
    CorrectionRequest,
)
import uuid


class AttendancePolicyModelTests(TestCase):
    """اختبار سياسات الحضور"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()

    def test_create_policy(self):
        policy = AttendancePolicy.objects.create(
            tenant_id=self.tenant_id,
            name='سياسة الدوام الرسمي',
            grace_period_minutes=15,
            half_day_late_minutes=120,
            is_active=True,
        )
        self.assertTrue(policy.is_active)
        self.assertEqual(policy.grace_period_minutes, 15)
        self.assertEqual(policy.half_day_late_minutes, 120)

    def test_policy_defaults(self):
        policy = AttendancePolicy.objects.create(
            tenant_id=self.tenant_id,
            name='سياسة بالقيم الافتراضية',
        )
        self.assertEqual(policy.grace_period_minutes, 15)
        self.assertEqual(policy.half_day_late_minutes, 120)
        self.assertTrue(policy.is_active)


class WorkShiftModelTests(TestCase):
    """اختبار نوبات العمل"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()

    def test_create_shift(self):
        shift = WorkShift.objects.create(
            tenant_id=self.tenant_id,
            name='الدوام الصباحي',
            start_time=time(7, 0),
            end_time=time(15, 0),
        )
        self.assertEqual(shift.name, 'الدوام الصباحي')
        self.assertEqual(shift.start_time, time(7, 0))

    def test_ramadan_shift(self):
        shift = WorkShift.objects.create(
            tenant_id=self.tenant_id,
            name='دوام رمضان',
            start_time=time(10, 0),
            end_time=time(15, 0),
            is_ramadan_shift=True,
        )
        self.assertTrue(shift.is_ramadan_shift)

    def test_multiple_shifts(self):
        WorkShift.objects.create(
            tenant_id=self.tenant_id,
            name='صباحي',
            start_time=time(7, 0),
            end_time=time(13, 0),
        )
        WorkShift.objects.create(
            tenant_id=self.tenant_id,
            name='مسائي',
            start_time=time(13, 0),
            end_time=time(21, 0),
        )
        self.assertEqual(WorkShift.objects.filter(tenant_id=self.tenant_id).count(), 2)


class AttendanceRecordModelTests(TestCase):
    """اختبار سجلات الحضور"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.employee = Employee.objects.create(
            tenant_id=self.tenant_id,
            employee_number='EMP-ATT-001',
            national_id='1234567890',
            full_name_ar='أحمد علي المعلم',
            gender='male',
            nationality='Saudi',
            date_of_birth='1990-05-15',
            department='Academics',
            position='Teacher',
            employment_type='Full-time',
        )

    def test_create_present_record(self):
        rec = AttendanceRecord.objects.create(
            tenant_id=self.tenant_id,
            employee=self.employee,
            date=date.today(),
            check_in=time(7, 25),
            check_out=time(15, 30),
            status='present',
            late_minutes=0,
        )
        self.assertEqual(rec.status, 'present')
        self.assertEqual(rec.late_minutes, 0)

    def test_create_late_record(self):
        rec = AttendanceRecord.objects.create(
            tenant_id=self.tenant_id,
            employee=self.employee,
            date=date.today(),
            check_in=time(8, 0),
            status='late',
            late_minutes=30,
        )
        self.assertEqual(rec.status, 'late')
        self.assertEqual(rec.late_minutes, 30)

    def test_create_absent_record(self):
        rec = AttendanceRecord.objects.create(
            tenant_id=self.tenant_id,
            employee=self.employee,
            date=date(2025, 1, 1),
            status='absent',
        )
        self.assertEqual(rec.status, 'absent')
        self.assertIsNone(rec.check_in)

    def test_overtime_minutes(self):
        rec = AttendanceRecord.objects.create(
            tenant_id=self.tenant_id,
            employee=self.employee,
            date=date(2025, 2, 1),
            check_in=time(7, 0),
            check_out=time(18, 0),
            status='present',
            overtime_minutes=120,
        )
        self.assertEqual(rec.overtime_minutes, 120)


class CorrectionRequestModelTests(TestCase):
    """اختبار طلبات تصحيح الحضور"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.employee = Employee.objects.create(
            tenant_id=self.tenant_id,
            employee_number='EMP-ATT-COR',
            national_id='9876543210',
            full_name_ar='سامي الشهري',
            gender='male',
            nationality='Saudi',
            date_of_birth='1988-03-10',
            department='Admin',
            position='Officer',
            employment_type='Full-time',
        )

    def test_create_correction_request(self):
        req = CorrectionRequest.objects.create(
            tenant_id=self.tenant_id,
            employee=self.employee,
            date=date.today(),
            reason='كنت في اجتماع طارئ مع المدير',
            requested_check_in=time(7, 30),
            status='pending',
        )
        self.assertEqual(req.status, 'pending')
        self.assertEqual(str(req.requested_check_in), '07:30:00')

    def test_approve_correction(self):
        req = CorrectionRequest.objects.create(
            tenant_id=self.tenant_id,
            employee=self.employee,
            date=date.today(),
            reason='خطأ في بصمة الحضور',
            requested_check_in=time(7, 25),
            status='pending',
        )
        req.status = 'approved'
        req.save()
        req.refresh_from_db()
        self.assertEqual(req.status, 'approved')

    def test_reject_correction(self):
        req = CorrectionRequest.objects.create(
            tenant_id=self.tenant_id,
            employee=self.employee,
            date=date(2025, 3, 1),
            reason='نسيت البصمة',
            status='pending',
        )
        req.status = 'rejected'
        req.save()
        req.refresh_from_db()
        self.assertEqual(req.status, 'rejected')