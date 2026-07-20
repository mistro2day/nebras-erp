"""إعادة ربط سجلات المكتبة والعيادة بأشخاص حقيقيين.

سبب وجوده: البيانات القائمة تحمل معرّفات يتيمة (UUID عشوائي) لا تطابق أي
طالب ولا موظف، فتظهر الشاشات بلا أسماء. هذا السكربت يربط كل سجل بشخص
حقيقي موجود، ويضبط حقل النوع الجديد ليُقرأ الاسم من السجل الصحيح.

يُشغَّل بأمان أكثر من مرة: لا يمسّ السجلات المرتبطة سلفاً بشخص صحيح.
    python relink_library_clinic.py
"""
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django  # noqa: E402

django.setup()

from apps.tenants.domain.models import Tenant  # noqa: E402
from apps.students.domain.models import Student  # noqa: E402
from apps.employees.domain.models import Employee  # noqa: E402
from apps.library.domain.models import BorrowTransaction  # noqa: E402
from apps.clinic.domain.models import (  # noqa: E402
    ClinicVisit, MedicalLeave, MedicalProfile,
)


def relink(tenant_id):
    students = list(Student.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True))
    employees = list(Employee.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True))
    if not students and not employees:
        print('  لا يوجد طلاب ولا موظفون — تعذّر الربط.')
        return

    valid_students = {str(s.id) for s in students}
    valid_employees = {str(e.id) for e in employees}

    def is_linked(person_type, person_id):
        pid = str(person_id)
        return pid in (valid_students if person_type == 'student' else valid_employees)

    def pick(index, prefer_student=True):
        """يوزّع السجلات على الأشخاص بالتناوب — واقعي وقابل للتكرار."""
        pool = students if (prefer_student and students) else (employees or students)
        person = pool[index % len(pool)]
        kind = 'student' if person in students else 'employee'
        return kind, person.id

    stats = {}

    # المكتبة: الطلاب أغلب المستعيرين، والموظفون بعضهم
    fixed = 0
    for i, tx in enumerate(BorrowTransaction.objects.filter(tenant_id=tenant_id)):
        if is_linked(tx.borrower_type, tx.borrower_user_id):
            continue
        kind, pid = pick(i, prefer_student=(i % 3 != 2))
        tx.borrower_type = kind
        tx.borrower_user_id = pid
        tx.save(update_fields=['borrower_type', 'borrower_user_id'])
        fixed += 1
    stats['استعارات'] = fixed

    # العيادة: زيارات وإجازات وملفات طبية
    for model, label, prefer in (
        (ClinicVisit, 'زيارات', True),
        (MedicalLeave, 'إجازات مرضية', True),
        (MedicalProfile, 'ملفات طبية', True),
    ):
        fixed = 0
        for i, rec in enumerate(model.objects.filter(tenant_id=tenant_id)):
            if is_linked(rec.patient_type, rec.patient_user_id):
                continue
            kind, pid = pick(i, prefer_student=(i % 4 != 3))
            rec.patient_type = kind
            rec.patient_user_id = pid
            try:
                rec.save(update_fields=['patient_type', 'patient_user_id'])
                fixed += 1
            except Exception as exc:  # noqa: BLE001 — الملف الطبي فريد لكل مريض
                print(f'    تعذّر ربط {label} ({rec.id}): {exc}')
        stats[label] = fixed

    print('  ' + ' | '.join(f'{k}: {v}' for k, v in stats.items()))


if __name__ == '__main__':
    for t in Tenant.objects.all():
        print(f'المستأجر: {getattr(t, "name", t.id)}')
        relink(t.id)
    print('تم الربط.')
