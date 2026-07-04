import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.clinic.domain.models import (
    ClinicVisit, VitalSigns, Medication, MedicationDispense, MedicalLeave, MedicalCertificate
)

# استدعاء خدمات المستودعات (Inventory Integration)
from apps.inventory.application.services import GoodsIssueService
from apps.inventory.domain.models import Warehouse, InventoryItem, InventoryUnit

# استدعاء خدمات الحضور والغياب (Attendance Integration)
from apps.attendance.models import StudentDailyAttendance  # تمثيل حضور الطلاب


class ClinicVisitService:
    @staticmethod
    @transaction.atomic
    def record_visit(tenant_id, clinic_id, patient_user_id, visit_type='walk_in', temp=37.0, bp_sys=120, bp_dia=80, pulse=75, user_id=None):
        """
        تسجيل زيارة جديدة للعيادة وقياس المؤشرات الحيوية بشكل فوري.
        """
        # 1. إنشاء الزيارة
        visit = ClinicVisit.objects.create(
            tenant_id=tenant_id,
            clinic_id=clinic_id,
            patient_user_id=patient_user_id,
            visit_type=visit_type,
            status='checked_in',
            check_in_time=timezone.now(),
            created_by=user_id
        )

        # 2. قياس وحفظ المؤشرات الحيوية
        VitalSigns.objects.create(
            tenant_id=tenant_id,
            visit=visit,
            temperature=Decimal(str(temp)),
            blood_pressure_sys=bp_sys,
            blood_pressure_dia=bp_dia,
            pulse_rate=pulse,
            created_by=user_id
        )

        return visit


class MedicationService:
    @staticmethod
    @transaction.atomic
    def dispense_medication(tenant_id, visit_id, medication_id, quantity, warehouse_id=None, user_id=None):
        """
        صرف دواء للمريض وخصمه مخزنيّاً بشكل تلقائي من موديول المستودعات.
        """
        visit = ClinicVisit.objects.get(tenant_id=tenant_id, id=visit_id)
        medication = Medication.objects.get(tenant_id=tenant_id, id=medication_id)

        # 1. صرف الدواء للمريض
        dispense = MedicationDispense.objects.create(
            tenant_id=tenant_id,
            visit=visit,
            medication=medication,
            quantity_dispensed=Decimal(str(quantity)),
            dispense_date=timezone.now().date(),
            created_by=user_id
        )

        # 2. التكامل مع المخازن: صرف كمية الدواء من المستودع المخصص للعيادة
        if warehouse_id and medication.inventory_item_id:
            # صرف المواد بالاتصال المباشر بـ GoodsIssueService
            issue_items = [
                {
                    'item_id': str(medication.inventory_item_id),
                    'qty_issued': float(quantity),
                    'unit_cost': 0.00
                }
            ]
            
            # استدعاء خدمة الصرف المستودعي لتخفيض الرصيد وتوليد قيود الإهلاك
            GoodsIssueService.issue_stock(
                tenant_id=tenant_id,
                warehouse_id=warehouse_id,
                issue_type='consumption',
                items_data=issue_items,
                user_id=user_id
            )

        return dispense


class MedicalLeaveService:
    @staticmethod
    @transaction.atomic
    def approve_medical_leave(tenant_id, leave_id, user_id=None):
        """
        اعتماد الإجازة المرضية وتحديث سجلات الحضور والغياب (تغيير الغياب المبرر بالتقرير الطبي).
        """
        leave = MedicalLeave.objects.get(tenant_id=tenant_id, id=leave_id)
        if leave.status == 'approved':
            raise ValidationError("الإجازة المرضية معتمدة ومسواة مسبقاً.")

        # 1. تحديث حالة الإجازة
        leave.status = 'approved'
        leave.save()

        # 2. التكامل مع الحضور والغياب:
        # البحث عن أيام غياب الطالب/الموظف خلال فترة الإجازة وتعديلها لتكون "غياب بعذر طبي"
        current_date = leave.start_date
        while current_date <= leave.end_date:
            # تحديث حالة الحضور في جدول StudentDailyAttendance
            # (مثال: تغيير الحالة إلى excused_absence)
            StudentDailyAttendance.objects.filter(
                tenant_id=tenant_id,
                student_id=leave.patient_user_id,
                date=current_date
            ).update(
                status='excused_absence',
                notes=f"غياب مبرر بإجازة مرضية معتمدة برقم {leave.id}"
            )
            current_date += timezone.timedelta(days=1)

        return leave
