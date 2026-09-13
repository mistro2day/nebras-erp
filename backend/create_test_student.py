import os
import sys
import django
import uuid
from datetime import date
from decimal import Decimal

# ضبط مسار المشروع وإعدادات جانغو
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from apps.tenants.domain.models import Tenant
from apps.students.domain.models import Student, StudentProfile, StudentEnrollment
from apps.academics.domain.models import AcademicYear, Grade, Section
from apps.student_finance.domain.models import StudentBillingAccount, StudentInvoice, Receipt

def create_test_student():
    """
    سكربت إنشاء طالب تجريبي متكامل مزود بحساب مالي وفاتورة وسند قبض وتسكين أكاديمي
    لتجربة معالج الحذف الشامل والتأكد من تصفية كافة السجلات عبر الموديولات.
    """
    tenant = Tenant.objects.first()
    tenant_id = tenant.id if tenant else uuid.uuid4()
    print(f"المستأجر المستخدم: {tenant.name if tenant else 'المستأجر الافتراضي'} ({tenant_id})")

    # تنظيف أي طالب تجريبي سابق بنفس الرقم إن وُجد
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM student_profiles WHERE student_id IN (SELECT id FROM students WHERE student_number = 'STU-TEST-9999')")
        cursor.execute("DELETE FROM student_enrollments WHERE student_id IN (SELECT id FROM students WHERE student_number = 'STU-TEST-9999')")
        cursor.execute("DELETE FROM students WHERE student_number = 'STU-TEST-9999'")
        cursor.execute("DELETE FROM nebras_student_invoices WHERE invoice_number = 'INV-TEST-9999'")
        cursor.execute("DELETE FROM nebras_student_receipts WHERE receipt_number = 'REC-TEST-9999'")
        cursor.execute("DELETE FROM nebras_student_billing_accounts WHERE account_number = 'ACC-TEST-9999'")

    # 1. إنشاء الطالب وسجله الشخصي
    student = Student.objects.create(
        tenant_id=tenant_id,
        student_number="STU-TEST-9999",
        status="active"
    )

    profile = StudentProfile.objects.create(
        tenant_id=tenant_id,
        student=student,
        arabic_name="نزار الفاتح المجذوب (طالب تجربة للحذف)",
        english_name="Nizar Elfatih Almajzoob (Test Delete)",
        gender="male",
        date_of_birth=date(2012, 5, 15),
        nationality="سوداني",
        national_id="198-05-998877",
        blood_group="O+",
        notes="طالب تجريبي مخصص لاختبار معالج الحذف الشامل والتحقق من مسح الفواتير والسندات"
    )

    # 2. إنشاء تسكين أكاديمي
    acad_year = AcademicYear.objects.filter(tenant_id=tenant_id).first()
    grade = Grade.objects.filter(tenant_id=tenant_id).first()
    section = Section.objects.filter(tenant_id=tenant_id, grade=grade).first() if grade else None

    if acad_year and grade:
        StudentEnrollment.objects.create(
            tenant_id=tenant_id,
            student=student,
            academic_year_id=acad_year.id,
            grade_id=grade.id,
            section_id=section.id if section else None,
            enrollment_date=date.today(),
            status="active"
        )
        print(f"تم إنشاء تسكين أكاديمي للصف: {grade.name}")

    # 3. إنشاء الحساب المالي وفاتورة وسند قبض لتجربة مسح المالية
    account = StudentBillingAccount.objects.create(
        tenant_id=tenant_id,
        student_id=student.id,
        account_number="ACC-TEST-9999",
        outstanding_balance=Decimal('100000.00'),
        current_balance=Decimal('100000.00')
    )
    print(f"تم إنشاء الحساب المالي: {account.account_number}")

    # فاتورة
    invoice = StudentInvoice.objects.create(
        tenant_id=tenant_id,
        student_billing_account=account,
        invoice_number="INV-TEST-9999",
        issue_date=date.today(),
        due_date=date.today(),
        total_amount=Decimal('150000.00'),
        paid_amount=Decimal('50000.00'),
        status="posted"
    )
    print(f"تم إنشاء الفاتورة: {invoice.invoice_number} (150,000 ج.س)")

    # سند قبض
    receipt = Receipt.objects.create(
        tenant_id=tenant_id,
        student_billing_account=account,
        receipt_number="REC-TEST-9999",
        payment_date=date.today(),
        amount=Decimal('50000.00'),
        payment_method_id=uuid.uuid4(),
        status="posted"
    )
    print(f"تم إنشاء سند القبض: {receipt.receipt_number} (50,000 ج.س)")

    print("\n" + "="*60)
    print("SUCCESS: تم إنشاء الطالب التجريبي وبياناته بنجاح!")
    print(f"معرف الطالب (ID): {student.id}")
    print(f"الاسم: {profile.arabic_name}")
    print(f"رقم القيد: {student.student_number}")
    print(f"الرابط المباشر: /students/details/{student.id}")
    print("="*60)
    return str(student.id)

if __name__ == "__main__":
    create_test_student()
