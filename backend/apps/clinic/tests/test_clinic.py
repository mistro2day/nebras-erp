import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone

from apps.clinic.domain.models import (
    Clinic, ClinicRoom, MedicalProfile, ClinicVisit, VitalSigns,
    Medication, MedicationDispense, MedicalLeave, MedicalCertificate
)
from apps.clinic.application.services import ClinicVisitService, MedicationService, MedicalLeaveService

# استيراد موديولات المخازن والحضور للتكامل
from apps.inventory.domain.models import Warehouse, InventoryItem, InventoryUnit
from apps.attendance.models import StudentDailyAttendance
from apps.students.models import Student  # تمثيل مستخدم طالب للربط

class ClinicTestCase(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        
        # 1. إعداد عيادة ومستودع مخزني للأدوية
        self.clinic = Clinic.objects.create(
            tenant_id=self.tenant_id,
            code="CLN-MAIN",
            name_ar="العيادة المدرسية الرئيسية",
            name_en="Main School Clinic"
        )
        self.warehouse = Warehouse.objects.create(
            tenant_id=self.tenant_id,
            code="CLN-WH",
            name_ar="مستودع مستلزمات العيادة",
            name_en="Clinic Supplies Warehouse"
        )
        from apps.inventory.domain.models import InventoryCategory
        self.inv_cat = InventoryCategory.objects.create(
            tenant_id=self.tenant_id,
            code="MED",
            name_ar="أدوية ومستلزمات طبية",
            name_en="Medicines"
        )
        self.unit = InventoryUnit.objects.create(
            tenant_id=self.tenant_id,
            code="BOX",
            name_ar="علبة",
            name_en="Box"
        )
        
        # صنف دواء مخزني
        self.inv_item = InventoryItem.objects.create(
            tenant_id=self.tenant_id,
            category=self.inv_cat,
            sku="MED-PAN-500",
            name_ar="بنادول 500 ملجم",
            name_en="Panadol 500mg",
            uom=self.unit
        )

        # دواء بالعيادة
        self.medication = Medication.objects.create(
            tenant_id=self.tenant_id,
            name_ar="بنادول خافض حرارة",
            name_en="Panadol Fever Reducer",
            inventory_item_id=self.inv_item.id
        )
        
        # رصيد مخزني
        from apps.inventory.domain.models import InventoryBalance
        InventoryBalance.objects.create(
            tenant_id=self.tenant_id,
            item=self.inv_item,
            warehouse=self.warehouse,
            qty_on_hand=Decimal('10.00'),
            qty_reserved=Decimal('0.00')
        )

        self.patient_id = uuid.uuid4()

        # 2. إعداد الحضور والغياب للطالب خلال تاريخ اليوم لمحاكاة تعديل الحضور
        self.today = timezone.now().date()
        self.attendance = StudentDailyAttendance.objects.create(
            tenant_id=self.tenant_id,
            student_id=self.patient_id,
            date=self.today,
            status='absent',
            notes="غياب غير مبرر"
        )

    def test_clinic_visit_and_vital_signs(self):
        visit = ClinicVisitService.record_visit(
            tenant_id=self.tenant_id,
            clinic_id=self.clinic.id,
            patient_user_id=self.patient_id,
            visit_type='walk_in',
            temp=38.5,
            bp_sys=125,
            bp_dia=82,
            pulse=80
        )

        self.assertEqual(visit.status, 'checked_in')
        vitals = VitalSigns.objects.get(tenant_id=self.tenant_id, visit=visit)
        self.assertEqual(vitals.temperature, Decimal('38.5'))
        self.assertEqual(vitals.blood_pressure_sys, 125)

    def test_medication_dispense_integration(self):
        visit = ClinicVisit.objects.create(
            tenant_id=self.tenant_id,
            clinic=self.clinic,
            patient_user_id=self.patient_id,
            status='checked_in'
        )

        dispense = MedicationService.dispense_medication(
            tenant_id=self.tenant_id,
            visit_id=visit.id,
            medication_id=self.medication.id,
            quantity=2.00,
            warehouse_id=self.warehouse.id
        )

        self.assertEqual(dispense.quantity_dispensed, Decimal('2.00'))
        self.assertEqual(dispense.medication, self.medication)

    def test_medical_leave_approval_excuses_attendance(self):
        leave = MedicalLeave.objects.create(
            tenant_id=self.tenant_id,
            patient_user_id=self.patient_id,
            start_date=self.today,
            end_date=self.today,
            status='submitted',
            reason="ارتفاع مفاجئ بدرجة الحرارة ونزلة برد حادة"
        )

        approved = MedicalLeaveService.approve_medical_leave(
            tenant_id=self.tenant_id,
            leave_id=leave.id
        )

        self.assertEqual(approved.status, 'approved')
        
        # التأكد من تكامل الحضور وتعديله تلقائياً بـ excused_absence
        self.attendance.refresh_from_db()
        self.assertEqual(self.attendance.status, 'excused_absence')
        self.assertTrue("غياب مبرر بإجازة مرضية" in self.attendance.notes)
