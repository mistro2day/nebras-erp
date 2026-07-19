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

    # 4. جلب الموظفين الحقيقيين من قاعدة البيانات
    real_employees = list(Employee.objects.filter(deleted_at__isnull=True))
    if tenant_id:
        real_employees = [e for e in real_employees if e.tenant_id == tenant_id]

    if not real_employees:
        print("خطأ: لم يتم العثور على أي موظف حقيقي في قاعدة البيانات.")
        return
    
    print(f"تم العثور على {len(real_employees)} موظف حقيقي.")

    # 5. تهيئة هياكل الرواتب وتوزيع الغياب والتأخير على كافة الموظفين
    print("جاري توليد سجلات الحضور والانصراف لشهر يونيو 2026 للموظفين الحقيقيين...")
    
    # حذف سجلات يونيو القديمة لهؤلاء الموظفين لتجنب التكرار
    AttendanceRecord.objects.filter(employee__in=real_employees, date__year=2026, date__month=6).delete()

    start_date = datetime.date(2026, 6, 1)
    end_date = datetime.date(2026, 6, 30)
    
    for idx, emp in enumerate(real_employees):
        # 5.1 ضمان وجود هيكل راتب نشط للموظف
        struct, struct_created = SalaryStructure.objects.get_or_create(
            employee=emp,
            tenant_id=tenant_id,
            defaults={
                "basic_salary": Decimal("10000.00") if idx % 2 == 0 else Decimal("12000.00"),
                "housing_allowance": Decimal("2000.00"),
                "transport_allowance": Decimal("1000.00"),
                "other_allowances": Decimal("500.00"),
                "is_active": True
            }
        )
        if struct_created:
            print(f"تم إنشاء هيكل راتب للموظف: {emp.full_name_ar}")

        # 5.2 تحديد سيناريو الحضور والغياب للموظف
        # نريد لكل موظف أن يكون لديه غياب وتأخير
        # الغياب: بين 1 إلى 4 أيام
        absent_days_count = (idx % 4) + 1 
        # التأخير: عدد دقائق التأخير في الأيام التي يحضر فيها
        late_days_count = 3
        late_minutes_per_day = 15 + (idx % 4) * 10 # 15, 25, 35, 45 دقيقة

        # نحدد عشوائياً/بشكل ثابت الأيام التي سيغيب فيها والأيام التي سيتأخر فيها
        # أيام العمل الفعلية في يونيو 2026 (تجاوز الأسبوعي)
        current_date = start_date
        work_days_count = 0
        
        # مصفوفة لتوزيع الأيام
        absent_days_indices = []
        late_days_indices = []
        
        # سنوزع الأيام بناءً على الترتيب
        # مثلاً الغياب في الأيام الأولى والـ late في الأيام اللاحقة
        for d in range(1, 23): # افتراض 22 يوم عمل كحد أقصى
            if len(absent_days_indices) < absent_days_count:
                absent_days_indices.append(d)
            elif len(late_days_indices) < late_days_count:
                late_days_indices.append(d)

        current_date = start_date
        work_days_count = 0
        
        while current_date <= end_date:
            weekday = current_date.weekday()
            is_workday = weekday not in (4, 5) # استبعاد الجمعة والسبت
            
            if is_workday:
                work_days_count += 1
                
                if work_days_count in absent_days_indices:
                    # يوم غياب
                    AttendanceRecord.objects.create(
                        employee=emp,
                        tenant_id=tenant_id,
                        date=current_date,
                        status="absent",
                        late_minutes=0
                    )
                elif work_days_count in late_days_indices:
                    # يوم تأخير
                    check_in_time = (datetime.datetime.combine(datetime.date.today(), datetime.time(8, 0)) + datetime.timedelta(minutes=late_minutes_per_day)).time()
                    AttendanceRecord.objects.create(
                        employee=emp,
                        tenant_id=tenant_id,
                        date=current_date,
                        check_in=check_in_time,
                        check_out=datetime.time(16, 0),
                        status="late",
                        late_minutes=late_minutes_per_day
                    )
                else:
                    # يوم حضور عادي
                    AttendanceRecord.objects.create(
                        employee=emp,
                        tenant_id=tenant_id,
                        date=current_date,
                        check_in=datetime.time(8, 0),
                        check_out=datetime.time(16, 0),
                        status="present",
                        late_minutes=0
                    )
            
            current_date += datetime.timedelta(days=1)
            
        print(f"تم توليد حضور الموظف {emp.full_name_ar}: غياب {absent_days_count} يوم، تأخير {late_days_count * late_minutes_per_day} دقيقة إجمالاً.")

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
    
    print("\n================== نتائج احتساب كشوف الرواتب لشهر يونيو 2026 للموظفين الحقيقيين ==================")
    for slip in run.payslips.all()[:10]: # عرض أول 10 للتأكيد
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
