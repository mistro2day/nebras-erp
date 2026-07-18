import os
import sys
import django
import datetime
from decimal import Decimal

# تهيئة بيئة Django
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.tenants.domain.models import Tenant
from apps.employees.domain.models import Employee
from apps.payroll.domain.models import SalaryStructure, PayrollPeriod, PayrollRun, Payslip
from apps.attendance.domain.models import AttendancePolicy, WorkShift, AttendanceRecord

def seed_attendance_payroll():
    # 1. جلب المستأجر
    tenant = Tenant.objects.filter(name="Nebras").first() or Tenant.objects.first()
    if not tenant:
        print("خطأ: لم يتم العثور على أي مستأجر (Tenant) في النظام.")
        return
    
    tenant_id = tenant.id
    print(f"استخدام المستأجر: {tenant.name} ({tenant_id})")

    # 2. إنشاء فترة المسير لشهر يونيو 2026
    period, created = PayrollPeriod.objects.get_or_create(
        code="2026-06",
        tenant_id=tenant_id,
        defaults={
            "start_date": datetime.date(2026, 6, 1),
            "end_date": datetime.date(2026, 6, 30),
            "is_processed": False
        }
    )
    print(f"تمت تهيئة فترة المسير 2026-06: {'تم الإنشاء' if created else 'موجودة مسبقاً'}")

    # 3. إنشاء سياسة الحضور والوردية
    policy, _ = AttendancePolicy.objects.get_or_create(
        name="سياسة الحضور العامة",
        tenant_id=tenant_id,
        defaults={"grace_period_minutes": 15, "half_day_late_minutes": 120}
    )
    shift, _ = WorkShift.objects.get_or_create(
        name="الوردية الصباحية الأساسية",
        tenant_id=tenant_id,
        defaults={
            "start_time": datetime.time(8, 0),
            "end_time": datetime.time(16, 0)
        }
    )
    print("تمت تهيئة سياسات الحضور والورديات.")

    # 4. تعريف بيانات الموظفين التجريبيين
    employees_data = [
        {
            "username": "committed_ahmed",
            "name": "أحمد الملتزم",
            "email": "ahmed.committed@nebras.edu",
            "pos": "معلم أول رياضيات",
            "type": "committed"
        },
        {
            "username": "late_mohamed",
            "name": "محمد المتأخر",
            "email": "mohamed.late@nebras.edu",
            "pos": "معلم لغة عربية",
            "type": "late"
        },
        {
            "username": "absent_omar",
            "name": "عمر الغائب",
            "email": "omar.absent@nebras.edu",
            "pos": "معلم لغة إنجليزية",
            "type": "absent"
        },
        {
            "username": "trouble_ali",
            "name": "علي المشاغب (متأخر وغائب)",
            "email": "ali.trouble@nebras.edu",
            "pos": "معلم تربية بدنية",
            "type": "trouble"
        },
        {
            "username": "full_absent_khaled",
            "name": "خالد الغياب الكامل",
            "email": "khaled.full@nebras.edu",
            "pos": "معلم فنون",
            "type": "full_absent"
        }
    ]

    employees = []
    for emp_info in employees_data:
        emp, emp_created = Employee.objects.get_or_create(
            email=emp_info["email"],
            tenant_id=tenant_id,
            defaults={
                "employee_number": f"EMP-TEST-{emp_info['username'].upper()}",
                "full_name_ar": emp_info["name"],
                "full_name_en": emp_info["username"].replace('_', ' ').title(),
                "status": "active",
                "department": "التربية والتعليم",
                "position": emp_info["pos"],
                "date_joined": datetime.date(2026, 1, 1),
                "gender": "male"
            }
        )
        employees.append((emp, emp_info["type"]))
        print(f"الموظف: {emp.full_name_ar} | {'تم إنشاؤه' if emp_created else 'موجود مسبقاً'}")

        # هيكل الراتب: أساسي 10,000 وبدلات 3,500
        SalaryStructure.objects.get_or_create(
            employee=emp,
            tenant_id=tenant_id,
            defaults={
                "basic_salary": Decimal("10000.00"),
                "housing_allowance": Decimal("2000.00"),
                "transport_allowance": Decimal("1000.00"),
                "other_allowances": Decimal("500.00"),
                "is_active": True
            }
        )

    # 5. توليد سجلات الحضور لشهر يونيو 2026 (أيام العمل فقط من الأحد للخميس)
    print("جاري توليد سجلات الحضور والانصراف لشهر يونيو 2026...")
    AttendanceRecord.objects.filter(employee__in=[e[0] for e in employees], date__year=2026, date__month=6).delete()

    start_date = datetime.date(2026, 6, 1)
    end_date = datetime.date(2026, 6, 30)
    current_date = start_date

    work_days_count = 0
    while current_date <= end_date:
        # 0 = الاثنين, 1 = الثلاثاء, 2 = الأربعاء, 3 = الخميس, 4 = الجمعة, 5 = السبت, 6 = الأحد
        # أيام العمل: الأحد إلى الخميس (0, 1, 2, 3, 6) والجمعة والسبت عطلة (4, 5)
        weekday = current_date.weekday()
        is_workday = weekday not in (4, 5)  # استبعاد الجمعة والسبت

        if is_workday:
            work_days_count += 1
            for emp, emp_type in employees:
                # توليد السجل حسب حالة الموظف
                if emp_type == "committed":
                    # ملتزم: حضور كامل بدون تأخير
                    AttendanceRecord.objects.create(
                        employee=emp,
                        tenant_id=tenant_id,
                        date=current_date,
                        check_in=datetime.time(8, 0),
                        check_out=datetime.time(16, 0),
                        status="present",
                        late_minutes=0
                    )
                elif emp_type == "late":
                    # متأخر: يتأخر 15 دقيقة في 8 أيام متفرقة (إجمالي 120 دقيقة تأخير)
                    is_late_day = (work_days_count % 3 == 0) and (work_days_count <= 24)
                    late_min = 15 if is_late_day else 0
                    check_in_time = datetime.time(8, 15) if is_late_day else datetime.time(8, 0)
                    AttendanceRecord.objects.create(
                        employee=emp,
                        tenant_id=tenant_id,
                        date=current_date,
                        check_in=check_in_time,
                        check_out=datetime.time(16, 0),
                        status="late" if is_late_day else "present",
                        late_minutes=late_min
                    )
                elif emp_type == "absent":
                    # غائب: غياب 3 أيام (مثلاً اليوم 5 و 10 و 15 من أيام العمل)
                    is_absent_day = work_days_count in (5, 10, 15)
                    if is_absent_day:
                        AttendanceRecord.objects.create(
                            employee=emp,
                            tenant_id=tenant_id,
                            date=current_date,
                            status="absent",
                            late_minutes=0
                        )
                    else:
                        AttendanceRecord.objects.create(
                            employee=emp,
                            tenant_id=tenant_id,
                            date=current_date,
                            check_in=datetime.time(8, 0),
                            check_out=datetime.time(16, 0),
                            status="present",
                            late_minutes=0
                        )
                elif emp_type == "trouble":
                    # مشاغب: غياب يومين (اليوم 4 و 12) وتأخير 30 دقيقة في 3 أيام (اليوم 2 و 8 و 14)
                    is_absent_day = work_days_count in (4, 12)
                    is_late_day = work_days_count in (2, 8, 14)
                    if is_absent_day:
                        AttendanceRecord.objects.create(
                            employee=emp,
                            tenant_id=tenant_id,
                            date=current_date,
                            status="absent",
                            late_minutes=0
                        )
                    else:
                        check_in_time = datetime.time(8, 30) if is_late_day else datetime.time(8, 0)
                        AttendanceRecord.objects.create(
                            employee=emp,
                            tenant_id=tenant_id,
                            date=current_date,
                            check_in=check_in_time,
                            check_out=datetime.time(16, 0),
                            status="late" if is_late_day else "present",
                            late_minutes=30 if is_late_day else 0
                        )
                elif emp_type == "full_absent":
                    # غياب كامل: غائب طوال الشهر
                    AttendanceRecord.objects.create(
                        employee=emp,
                        tenant_id=tenant_id,
                        date=current_date,
                        status="absent",
                        late_minutes=0
                    )

        current_date += datetime.timedelta(days=1)

    print(f"تمت تهيئة حضور {work_days_count} يوم عمل لشهر يونيو 2026 بنجاح.")

    # 6. إنشاء مسير الرواتب draft
    run, run_created = PayrollRun.objects.get_or_create(
        period=period,
        tenant_id=tenant_id,
        defaults={
            "status": "draft",
            "total_cost": Decimal("0.00")
        }
    )
    print(f"مسير الرواتب لشهر يونيو 2026: {'تم إنشاؤه' if run_created else 'موجود مسبقاً'}")

    # 7. احتساب كشوف الرواتب لتحديث القيم
    from apps.payroll.interfaces.views import PayrollRunViewSet
    viewset = PayrollRunViewSet()
    viewset.process_payroll_logic(run, preview_only=True)
    
    print("\n================== نتائج احتساب كشوف الرواتب لشهر يونيو 2026 ==================")
    for slip in run.payslips.all():
        print(f"الموظف: {slip.employee.full_name_ar}")
        print(f"  الراتب الأساسي: {slip.basic_salary} ج.س")
        print(f"  إجمالي المستحقات: {slip.gross_earnings} ج.س")
        print(f"  دقائق التأخير: {slip.late_minutes} دقيقة | خصم التأخير: {slip.late_deduction} ج.س")
        print(f"  أيام الغياب: {slip.absence_days} يوم | خصم الغياب: {slip.absence_deduction} ج.س")
        print(f"  إجمالي الخصومات: {slip.total_deductions} ج.س")
        print(f"  صافي الراتب: {slip.net_salary} ج.س")
        print("-" * 50)

if __name__ == "__main__":
    seed_attendance_payroll()
