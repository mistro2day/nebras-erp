import os
import sys
import django
import uuid
import datetime

sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.tenants.domain.models import Tenant
from apps.faculty.domain.models import FacultyMember, TeacherAssignment
from apps.employees.domain.models import Employee
from apps.academics.domain.subjects import Subject
from apps.academics.domain.models import Section, Grade, AcademicYear, Term

def seed_faculty():
    tenant = Tenant.objects.filter(name="Nebras").first()
    if not tenant:
        tenant = Tenant.objects.first()
    if not tenant:
        print("No tenant found!")
        return

    tenant_id = tenant.id
    print(f"Using Tenant: {tenant.name} ({tenant_id})")

    year = AcademicYear.objects.filter(deleted_at__isnull=True, tenant_id=tenant_id, current_flag=True).first()
    if not year:
        year = AcademicYear.objects.filter(deleted_at__isnull=True, tenant_id=tenant_id).first()
    term = Term.objects.filter(deleted_at__isnull=True, tenant_id=tenant_id).first()

    if not year or not term:
        print("Missing active academic year or term!")
        return

    print(f"Year: {year.name} ({year.id})")
    print(f"Term: {term.name} ({term.id})")

    faculty_map = {}

    teachers_data = [
        {"emp_num": "EMP-2026-001", "code": "TCH-001", "national_id": "NAT-100200301", "name": "أحمد محمد علي", "gender": "male", "email": "ahmed@nebras.edu", "phone": "0912345678", "dept": "التعليم والإشراف", "pos": "معلم أول لغة عربية وتربية إسلامية"},
        {"emp_num": "EMP-2026-002", "code": "TCH-002", "national_id": "NAT-100200302", "name": "فاطمة عمر عثمان", "gender": "female", "email": "fatima@nebras.edu", "phone": "0922446688", "dept": "التعليم والإشراف", "pos": "معلمة أولى رياضيات وعلوم"},
        {"emp_num": "EMP-2026-003", "code": "TCH-003", "national_id": "NAT-100200303", "name": "ياسر عبد الله الطيب", "gender": "male", "email": "yasir@nebras.edu", "phone": "0911883377", "dept": "التعليم والإشراف", "pos": "معلم لغة إنجليزية"},
        {"emp_num": "EMP-2026-004", "code": "TCH-004", "national_id": "NAT-100200304", "name": "حسن البشير الهادي", "gender": "male", "email": "hassan@nebras.edu", "phone": "0966778899", "dept": "التعليم والإشراف", "pos": "معلم تقنية معلومات وفنون"},
        {"emp_num": "EMP-2026-005", "code": "TCH-005", "national_id": "NAT-100200305", "name": "خديجة الطيب محمد", "gender": "female", "email": "khadija@nebras.edu", "phone": "0955331122", "dept": "التعليم والإشراف", "pos": "معلمة قرآن كريم وتجويد"},
        {"emp_num": "EMP-2026-006", "code": "TCH-006", "national_id": "NAT-100200306", "name": "عمر خليل إبراهيم", "gender": "male", "email": "omar@nebras.edu", "phone": "0933445566", "dept": "التعليم والإشراف", "pos": "معلم لغة عربية"},
        {"emp_num": "EMP-2026-007", "code": "TCH-007", "national_id": "NAT-100200307", "name": "سارة محمود حسن", "gender": "female", "email": "sara@nebras.edu", "phone": "0944556677", "dept": "التعليم والإشراف", "pos": "معلمة لغة إنجليزية"},
        {"emp_num": "EMP-2026-008", "code": "TCH-008", "national_id": "NAT-100200308", "name": "علي حسن أحمد", "gender": "male", "email": "ali@nebras.edu", "phone": "0911223344", "dept": "التعليم والإشراف", "pos": "معلم رياضيات"},
        {"emp_num": "EMP-2026-009", "code": "TCH-009", "national_id": "NAT-100200309", "name": "مريم إبراهيم عمر", "gender": "female", "email": "maryam@nebras.edu", "phone": "0922334455", "dept": "التعليم والإشراف", "pos": "معلمة علوم"},
        {"emp_num": "EMP-2026-010", "code": "TCH-010", "national_id": "NAT-100200310", "name": "يوسف نور الدين", "gender": "male", "email": "youssef@nebras.edu", "phone": "0955667788", "dept": "التعليم والإشراف", "pos": "معلم تربية إسلامية"},
        {"emp_num": "EMP-2026-011", "code": "TCH-011", "national_id": "NAT-100200311", "name": "عائشة سعيد محمد", "gender": "female", "email": "aisha@nebras.edu", "phone": "0966778890", "dept": "التعليم والإشراف", "pos": "معلمة دراسات اجتماعية"},
        {"emp_num": "EMP-2026-012", "code": "TCH-012", "national_id": "NAT-100200312", "name": "مصطفى علي يوسف", "gender": "male", "email": "mustafa@nebras.edu", "phone": "0977889900", "dept": "التعليم والإشراف", "pos": "معلم تربية فنية"},
        {"emp_num": "EMP-2026-013", "code": "TCH-013", "national_id": "NAT-100200313", "name": "ليلى كريم الدين", "gender": "female", "email": "layla@nebras.edu", "phone": "0988990011", "dept": "التعليم والإشراف", "pos": "معلمة حاسوب وتقنية معلومات"},
        {"emp_num": "EMP-2026-014", "code": "TCH-014", "national_id": "NAT-100200314", "name": "حمد عمر خالد", "gender": "male", "email": "hamed@nebras.edu", "phone": "0910001122", "dept": "التعليم والإشراف", "pos": "معلم تربية بدنية"},
        {"emp_num": "EMP-2026-015", "code": "TCH-015", "national_id": "NAT-100200315", "name": "نور الدين أحمد", "gender": "male", "email": "nour@nebras.edu", "phone": "0921112233", "dept": "التعليم والإشراف", "pos": "معلم لغة عربية"},
        {"emp_num": "EMP-2026-016", "code": "TCH-016", "national_id": "NAT-100200316", "name": "رانيا صديق حسن", "gender": "female", "email": "rania@nebras.edu", "phone": "0932223344", "dept": "التعليم والإشراف", "pos": "معلمة لغة إنجليزية"},
        {"emp_num": "EMP-2026-017", "code": "TCH-017", "national_id": "NAT-100200317", "name": "طارق فريد علي", "gender": "male", "email": "tariq@nebras.edu", "phone": "0943334455", "dept": "التعليم والإشراف", "pos": "معلم رياضيات"},
        {"emp_num": "EMP-2026-018", "code": "TCH-018", "national_id": "NAT-100200318", "name": "سلمى زبير عمر", "gender": "female", "email": "salma@nebras.edu", "phone": "0954445566", "dept": "التعليم والإشراف", "pos": "معلمة علوم"},
        {"emp_num": "EMP-2026-019", "code": "TCH-019", "national_id": "NAT-100200319", "name": "إبراهيم موسى حسن", "gender": "male", "email": "ibrahim@nebras.edu", "phone": "0965556677", "dept": "التعليم والإشراف", "pos": "معلم تربية إسلامية"},
        {"emp_num": "EMP-2026-020", "code": "TCH-020", "national_id": "NAT-100200320", "name": "هدى ناصر الدين", "gender": "female", "email": "huda@nebras.edu", "phone": "0976667788", "dept": "التعليم والإشراف", "pos": "معلمة قرآن كريم وتجويد"},
    ]

    for td in teachers_data:
        # 1) الموظف: المصدر الوحيد للبيانات الشخصية (بعد توحيد مصدر الحقيقة)
        employee, _ = Employee.objects.get_or_create(
            tenant_id=tenant_id,
            national_id=td["national_id"],
            defaults={
                "employee_number": td["emp_num"],
                "full_name_ar": td["name"],
                "gender": td["gender"],
                "nationality": "سوداني",
                "date_of_birth": datetime.date(1985, 5, 12),
                "email": td["email"],
                "mobile": td["phone"],
                "department": td["dept"],
                "position": td["pos"],
                "status": "active",
            },
        )
        # 2) الدور الأكاديمي: يقرأ الشخصية من الموظف ولا يكرّرها
        faculty, created = FacultyMember.objects.get_or_create(
            tenant_id=tenant_id,
            teacher_code=td["code"],
            defaults={
                "employee": employee,
                "department": td["dept"],
                "current_position": td["pos"],
                "status": "approved",
            },
        )
        if created:
            print(f"  Created FacultyMember: {td['name']}")
        else:
            faculty.status = "approved"
            faculty.save()
            print(f"  FacultyMember {td['name']} already exists")
        faculty_map[td["emp_num"]] = faculty

    all_grades = list(Grade.objects.filter(deleted_at__isnull=True, tenant_id=tenant_id).order_by('order'))
    print(f"\nFound {len(all_grades)} grades.")

    for grade in all_grades:
        existing_sections = list(Section.objects.filter(deleted_at__isnull=True, tenant_id=tenant_id, grade_id=grade.id))
        if not existing_sections:
            section_name = "أ"
            section_code = f"{grade.code}-A"
            Section.objects.create(
                grade_id=grade.id,
                name=section_name,
                code=section_code,
                capacity=30,
                gender="male",
                status=True,
                academic_shift="Morning Shift",
                tenant_id=tenant_id
            )
            section_name = "ب"
            section_code = f"{grade.code}-B"
            Section.objects.create(
                grade_id=grade.id,
                name=section_name,
                code=section_code,
                capacity=30,
                gender="female",
                status=True,
                academic_shift="Morning Shift",
                tenant_id=tenant_id
            )
            print(f"  Created 2 sections for grade: {grade.name}")
        else:
            print(f"  Grade {grade.name} already has {len(existing_sections)} section(s)")

    sections = list(Section.objects.filter(deleted_at__isnull=True, tenant_id=tenant_id))
    subjects = list(Subject.objects.filter(deleted_at__isnull=True, tenant_id=tenant_id))

    if not subjects or not sections:
        print("Missing subjects or sections!")
        return

    print(f"\nTotal sections: {len(sections)}")
    print(f"Total subjects: {len(subjects)}")

    TeacherAssignment.objects.filter(tenant_id=tenant_id).delete()
    print("Cleared existing teacher assignments.")

    def get_teacher_for_subject(subject_code, grade_order):
        code = subject_code.lower()
        if "quran" in code:
            if grade_order <= 6:
                return faculty_map.get("EMP-2026-005")
            return faculty_map.get("EMP-2026-020")
        elif "islamic" in code:
            if grade_order <= 4:
                return faculty_map.get("EMP-2026-001")
            return faculty_map.get("EMP-2026-019")
        elif "arabic" in code:
            if grade_order <= 4:
                return faculty_map.get("EMP-2026-001")
            elif grade_order <= 8:
                return faculty_map.get("EMP-2026-015")
            return faculty_map.get("EMP-2026-006")
        elif "english" in code:
            if grade_order <= 4:
                return faculty_map.get("EMP-2026-003")
            elif grade_order <= 8:
                return faculty_map.get("EMP-2026-016")
            return faculty_map.get("EMP-2026-007")
        elif "advmath" in code or "basicmat" in code:
            if grade_order <= 8:
                return faculty_map.get("EMP-2026-002")
            return faculty_map.get("EMP-2026-017")
        elif "math" in code:
            if grade_order <= 4:
                return faculty_map.get("EMP-2026-002")
            elif grade_order <= 8:
                return faculty_map.get("EMP-2026-017")
            return faculty_map.get("EMP-2026-008")
        elif "physics" in code or "chemistry" in code or "biology" in code:
            if grade_order <= 4:
                return faculty_map.get("EMP-2026-002")
            return faculty_map.get("EMP-2026-018")
        elif "science" in code:
            if grade_order <= 4:
                return faculty_map.get("EMP-2026-002")
            elif grade_order <= 8:
                return faculty_map.get("EMP-2026-018")
            return faculty_map.get("EMP-2026-009")
        elif "social" in code or "history" in code or "geograph" in code or "economic" in code:
            if grade_order <= 6:
                return faculty_map.get("EMP-2026-011")
            return faculty_map.get("EMP-2026-011")
        elif "civics" in code:
            return faculty_map.get("EMP-2026-001")
        elif "art" in code:
            if grade_order <= 6:
                return faculty_map.get("EMP-2026-004")
            return faculty_map.get("EMP-2026-012")
        elif "tech" in code or "computer" in code or "ict" in code:
            if grade_order <= 6:
                return faculty_map.get("EMP-2026-004")
            return faculty_map.get("EMP-2026-013")
        elif "pe" in code:
            return faculty_map.get("EMP-2026-014")
        else:
            return faculty_map.get("EMP-2026-004")

    assignments_created = 0
    assignments_by_teacher = {}
    # ميزانية ساعات أسبوعية لكل معلم حتى لا تتجاوز التكليفات نصابه (نصاب العقد 23)
    teacher_hours = {}
    DEFAULT_QUOTA = 23
    skipped_over_quota = 0

    # فهرسة المواد حسب الصف: القسم يأخذ مواد صفّه فقط (لا كل المواد)
    subjects_by_grade = {}
    for sub in subjects:
        subjects_by_grade.setdefault(sub.grade_id, []).append(sub)

    for sec in sections:
        grade = Grade.objects.filter(id=sec.grade_id).first()
        grade_order = grade.order if grade else 0
        # مواد هذا الصف فقط + المواد العامة (بلا صف)
        grade_subjects = subjects_by_grade.get(sec.grade_id, []) + subjects_by_grade.get(None, [])
        for sub in grade_subjects:
            teacher = get_teacher_for_subject(sub.code, grade_order)
            if not teacher:
                continue
            # ساعات المادة الأسبوعية الفعلية (لا رقم ثابت)
            hours = int(getattr(sub, 'weekly_periods', 0) or 4)
            quota = getattr(teacher.employee, 'weekly_lesson_quota', DEFAULT_QUOTA) or DEFAULT_QUOTA
            used = teacher_hours.get(teacher.id, 0)
            if used + hours > quota:
                skipped_over_quota += 1
                continue  # المعلم اكتمل نصابه — لا نُثقل عليه (واقعية)
            TeacherAssignment.objects.create(
                faculty_member=teacher,
                academic_year_id=year.id,
                term_id=term.id,
                subject_id=sub.id,
                section_id=sec.id,
                weekly_hours=hours,
                tenant_id=tenant_id
            )
            teacher_hours[teacher.id] = used + hours
            assignments_created += 1
            assignments_by_teacher.setdefault(teacher.full_name_ar, 0)
            assignments_by_teacher[teacher.full_name_ar] += 1

    print(f"\nSuccessfully created {assignments_created} teacher assignments!")
    if skipped_over_quota:
        print(f"({skipped_over_quota} تكليفاً تُخطّي لعدم تجاوز نصاب المعلمين — واقعية)")
    print("\nAssignments per teacher (hours / quota):")
    for name, count in sorted(assignments_by_teacher.items(), key=lambda x: -x[1]):
        # اعثر على ساعات هذا المعلم للعرض
        hrs = next((teacher_hours.get(t.id, 0) for t in faculty_map.values()
                    if t and t.full_name_ar == name), 0)
        print(f"  {name}: {count} تكليف · {hrs} ساعة/أسبوع")

if __name__ == "__main__":
    seed_faculty()
