import uuid
from typing import List, Dict, Any, Optional
from django.db import transaction, models
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.academics.domain.models import Section, Grade, AcademicYear
from apps.students.domain.models import Student, StudentEnrollment, StudentStatusHistory


class StudentDistributionService:
    """
    خدمة معالجة وتوزيع الطلاب على الفصول والشعب الدراسية.
    تعتمد استعلامات مجمعة وعمليات ذرية لتسريع الأداء وتفادي تضارب القيود الأكاديمية.
    """

    @classmethod
    def get_distribution_overview(cls, tenant_id: uuid.UUID, grade_id: uuid.UUID, academic_year_id: uuid.UUID) -> Dict[str, Any]:
        """
        جلب نظرة عامة شاملة لكافة شعب الصف والطلاب المقيدين (المسكَّنون وغير المسكَّنين) في استعلامين سريعين.
        """
        # 1. جلب الشعب التابعة للصف
        sections_qs = Section.objects.filter(
            tenant_id=tenant_id,
            grade_id=grade_id,
            deleted_at__isnull=True
        ).order_by('name')

        sections_data = []
        section_ids = []
        for sec in sections_qs:
            section_ids.append(sec.id)
            sections_data.append({
                'id': str(sec.id),
                'name': sec.name,
                'code': sec.code,
                'capacity': sec.capacity or 30,
                'gender': sec.gender,
                'status': sec.status,
                'class_teacher_id': str(sec.class_teacher_id) if sec.class_teacher_id else None,
                'occupied_seats': 0,
                'available_seats': sec.capacity or 30,
            })

        # 2. جلب جميع تسجيلات الطلاب النشطة لهذا الصف والسنة
        enrollments = (
            StudentEnrollment.objects
            .filter(
                tenant_id=tenant_id,
                grade_id=grade_id,
                academic_year_id=academic_year_id,
                deleted_at__isnull=True,
                status='active'
            )
            .select_related('student', 'student__profile')
            .order_by('student__profile__arabic_name', 'student__student_number')
        )

        students_list = []
        section_counts = {str(sec_id): 0 for sec_id in section_ids}

        for en in enrollments:
            student = en.student
            if not student or student.deleted_at:
                continue

            profile = getattr(student, 'profile', None)
            sec_id_str = str(en.section_id) if en.section_id else None

            if sec_id_str and sec_id_str in section_counts:
                section_counts[sec_id_str] += 1

            student_name = ''
            if profile and profile.arabic_name:
                student_name = profile.arabic_name
            elif student.first_name:
                student_name = f"{student.first_name} {student.last_name or ''}".strip()
            else:
                student_name = 'طالب'

            students_list.append({
                'id': str(student.id),
                'enrollment_id': str(en.id),
                'student_number': student.student_number or '',
                'name': student_name,
                'gender': profile.gender if (profile and profile.gender) else 'male',
                'status': student.status or 'active',
                'section_id': sec_id_str,
                'grade_id': str(grade_id),
                'academic_year_id': str(academic_year_id),
            })

        # تحديث أعداد المقاعد المشغولة والمتاحة لكل شعبة
        total_capacity = 0
        total_assigned = 0
        for sec in sections_data:
            occupied = section_counts.get(sec['id'], 0)
            sec['occupied_seats'] = occupied
            sec['available_seats'] = max(0, sec['capacity'] - occupied)
            total_capacity += sec['capacity']
            total_assigned += occupied

        total_students = len(students_list)
        unassigned_count = total_students - total_assigned

        return {
            'grade_id': str(grade_id),
            'academic_year_id': str(academic_year_id),
            'sections': sections_data,
            'students': students_list,
            'stats': {
                'total_students': total_students,
                'assigned_count': total_assigned,
                'unassigned_count': unassigned_count,
                'total_capacity': total_capacity,
                'occupancy_percentage': round((total_assigned / total_capacity * 100), 1) if total_capacity > 0 else 0,
            }
        }

    @classmethod
    def bulk_assign_sections(
        cls,
        tenant_id: uuid.UUID,
        user_id: Optional[uuid.UUID],
        academic_year_id: uuid.UUID,
        grade_id: uuid.UUID,
        allocations: List[Dict[str, str]],
        allow_overflow: bool = False
    ) -> Dict[str, Any]:
        """
        حفظ مجمع لتسكين ونقل الطلاب بين الشعب داخل الصف في معاملة ذرية واحدة.
        allocations: قائمة قواميس [{'student_id': '...', 'section_id': '...' or None}]
        """
        if not allocations:
            return {'success': True, 'count': 0, 'message': 'لا توجد تعيينات للحفظ.'}

        student_ids = [uuid.UUID(a['student_id']) for a in allocations if a.get('student_id')]
        target_section_ids = {
            uuid.UUID(a['section_id']) for a in allocations if a.get('section_id')
        }

        # جلب الشعب والتأكد من وجودها
        sections_map = {
            sec.id: sec
            for sec in Section.objects.filter(id__in=target_section_ids, tenant_id=tenant_id, deleted_at__isnull=True)
        }

        with transaction.atomic():
            # جلب تسجيلات الطلاب القائمة للسنة والصف
            existing_enrollments = {
                en.student_id: en
                for en in StudentEnrollment.objects.filter(
                    tenant_id=tenant_id,
                    student_id__in=student_ids,
                    grade_id=grade_id,
                    academic_year_id=academic_year_id,
                    deleted_at__isnull=True,
                    status='active'
                )
            }

            updated_count = 0
            created_count = 0

            for alloc in allocations:
                s_id = uuid.UUID(alloc['student_id'])
                sec_id = uuid.UUID(alloc['section_id']) if alloc.get('section_id') else None

                # التحقق من الشعبة إن وجدت
                if sec_id and sec_id not in sections_map:
                    raise ValidationError(f"الشعبة المحددة ({sec_id}) غير صالحة أو لا تتبع المدرسة.")

                enrollment = existing_enrollments.get(s_id)
                if enrollment:
                    if enrollment.section_id != sec_id:
                        enrollment.section_id = sec_id
                        enrollment.save(update_fields=['section_id', 'updated_at'])
                        updated_count += 1
                else:
                    StudentEnrollment.objects.create(
                        tenant_id=tenant_id,
                        student_id=s_id,
                        academic_year_id=academic_year_id,
                        grade_id=grade_id,
                        section_id=sec_id,
                        enrollment_date=timezone.now().date(),
                        enrollment_type='new',
                        status='active',
                        created_by=user_id or uuid.uuid4()
                    )
                    created_count += 1

            return {
                'success': True,
                'updated_count': updated_count,
                'created_count': created_count,
                'total_processed': len(allocations),
                'message': f"تم بنجاح حفظ وتحديث تسكين {len(allocations)} طالب."
            }

    @classmethod
    def simulate_auto_distribution(
        cls,
        tenant_id: uuid.UUID,
        grade_id: uuid.UUID,
        academic_year_id: uuid.UUID,
        strategy: str = 'balanced',
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        محاكاة التوزيع الآلي الذكي للطلاب وإرجاع خطة التسكين المقترحة للمعاينة.
        """
        options = options or {}
        preserve_existing = options.get('preserve_existing', True)
        allow_overflow = options.get('allow_overflow', False)

        overview = cls.get_distribution_overview(tenant_id, grade_id, academic_year_id)
        sections = overview['sections']
        all_students = overview['students']

        if not sections:
            raise ValidationError("لا توجد فصول دراسية لهذا الصف لبدء التوزيع.")

        if preserve_existing:
            pool = [s for s in all_students if not s.get('section_id')]
        else:
            pool = list(all_students)

        if not pool:
            return {
                'plan': [],
                'unplaced': [],
                'total_planned': 0,
                'total_unplaced': 0,
                'message': 'جميع الطلاب موزعون بالفعل على الفصول.'
            }

        if strategy == 'alphabetical':
            pool = sorted(pool, key=lambda x: x['name'])
        elif strategy == 'gender':
            pool = sorted(pool, key=lambda x: (x.get('gender', 'male'), x['name']))

        load: Dict[str, int] = {}
        for sec in sections:
            sec_id = sec['id']
            load[sec_id] = sec['occupied_seats'] if preserve_existing else 0

        plan = []
        unplaced = []

        for student in pool:
            s_gender = student.get('gender', 'male')

            candidates = []
            for sec in sections:
                sec_gender = sec.get('gender', 'mixed')
                gender_match = (sec_gender == 'mixed' or sec_gender == s_gender)
                has_capacity = allow_overflow or (load[sec['id']] < sec['capacity'])

                if gender_match and has_capacity:
                    ratio = (load[sec['id']] / max(sec['capacity'], 1))
                    candidates.append((ratio, sec))

            if candidates:
                candidates.sort(key=lambda item: item[0])
                target_sec = candidates[0][1]

                plan.append({
                    'student_id': student['id'],
                    'student_name': student['name'],
                    'gender': s_gender,
                    'section_id': target_sec['id'],
                    'section_name': target_sec['name'],
                })
                load[target_sec['id']] += 1
            else:
                unplaced.append({
                    'student_id': student['id'],
                    'student_name': student['name'],
                    'gender': s_gender,
                    'reason': 'لا توجد مقاعد متاحة أو عدم مطابقة الجنس'
                })

        return {
            'plan': plan,
            'unplaced': unplaced,
            'total_planned': len(plan),
            'total_unplaced': len(unplaced),
            'strategy': strategy,
            'message': f"تم اقتراح توزيع {len(plan)} طالب بنجاح مع تبقي {len(unplaced)} بدون تسكين."
        }
