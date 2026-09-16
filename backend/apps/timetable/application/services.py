from apps.scheduling.application.services import ConflictDetectionService
from apps.rules.application.services import RuleEvaluationService
from apps.timetable.domain.models import (
    AcademicTimetable,
    TimetableEntry,
    TeachingLoad,
    TeachingAssignment,
    SubjectDistribution,
    ClassPeriod,
    TimetableSubstitution
)
from apps.faculty.domain.models import FacultyMember

from datetime import date
import random

class TimetableOrchestratorService:
    """
    منسق الجدول الدراسي مع محركات الجدولة الذكية وكشف التعارضات وإدارة المدرسة كاملة
    """

    @classmethod
    def check_conflicts(cls, tenant_id, timetable_id, day_of_week, period, teacher, subject_id, room_id, grade_section_id, exclude_entry_id=None):
        """
        التحقق الصارم من التعارضات الأكاديمية على مستوى الجدول المدرسي الكامل:
        1. تضارب المعلم (Teacher Double Booking)
        2. تضارب الشعبة (Section Double Booking)
        3. تضارب القاعة/المعمل (Room Double Booking)
        4. تجاوز الحد الأقصى اليومي والأسبوعي للمعلم
        """
        conflicts = []

        # 1. تضارب المعلم في نفس اليوم والحصة
        teacher_overlap = TimetableEntry.objects.filter(
            timetable_id=timetable_id,
            day_of_week=day_of_week,
            period=period,
            teacher=teacher,
            deleted_at__isnull=True
        )
        if tenant_id:
            teacher_overlap = teacher_overlap.filter(tenant_id=tenant_id)
        if exclude_entry_id:
            teacher_overlap = teacher_overlap.exclude(id=exclude_entry_id)

        if teacher_overlap.exists():
            conflicts.append({
                'conflict_type': 'teacher_double_booking',
                'description': f"المعلم {teacher.full_name_ar} لديه حصة أخرى مجدولة في نفس الحصة واليوم."
            })

        # 2. تضارب الشعبة في نفس اليوم والحصة
        section_overlap = TimetableEntry.objects.filter(
            timetable_id=timetable_id,
            day_of_week=day_of_week,
            period=period,
            grade_section_id=grade_section_id,
            deleted_at__isnull=True
        )
        if tenant_id:
            section_overlap = section_overlap.filter(tenant_id=tenant_id)
        if exclude_entry_id:
            section_overlap = section_overlap.exclude(id=exclude_entry_id)

        if section_overlap.exists():
            conflicts.append({
                'conflict_type': 'section_double_booking',
                'description': "الشعبة الدراسية لديها حصة أخرى مسجلة بالفعل في هذه الفترة."
            })

        # 3. تضارب القاعة أو المعمل
        if room_id and str(room_id) not in ['00000000-0000-0000-0000-000000000000', '']:
            room_overlap = TimetableEntry.objects.filter(
                timetable_id=timetable_id,
                day_of_week=day_of_week,
                period=period,
                room_id=room_id,
                deleted_at__isnull=True
            )
            if tenant_id:
                room_overlap = room_overlap.filter(tenant_id=tenant_id)
            if exclude_entry_id:
                room_overlap = room_overlap.exclude(id=exclude_entry_id)

            if room_overlap.exists():
                conflicts.append({
                    'conflict_type': 'room_double_booking',
                    'description': "القاعة أو المعمل محجوز لشعبة أخرى في نفس الفترة."
                })

        # 4. التحقق من العبء اليومي للمعلم
        daily_entries_count = TimetableEntry.objects.filter(
            timetable_id=timetable_id,
            day_of_week=day_of_week,
            teacher=teacher,
            deleted_at__isnull=True
        )
        if tenant_id:
            daily_entries_count = daily_entries_count.filter(tenant_id=tenant_id)
        if exclude_entry_id:
            daily_entries_count = daily_entries_count.exclude(id=exclude_entry_id)

        max_daily = 6
        if hasattr(teacher, 'teaching_load') and teacher.teaching_load:
            max_daily = teacher.teaching_load.max_daily_hours or 6

        if daily_entries_count.count() >= max_daily:
            conflicts.append({
                'conflict_type': 'daily_load_exceeded',
                'description': f"المعلم {teacher.full_name_ar} بلغ الحد الأقصى للحصص اليومية ({max_daily} حصص)."
            })

        # 5. التحقق من النصاب الأسبوعي
        if hasattr(teacher, 'teaching_load') and teacher.teaching_load:
            assigned = teacher.teaching_load.assigned_weekly_hours or 0
            max_w = teacher.teaching_load.max_weekly_hours or 24
            if assigned >= max_w and not exclude_entry_id:
                conflicts.append({
                    'conflict_type': 'teaching_load_exceeded',
                    'description': f"المعلم {teacher.full_name_ar} تجاوز الحد الأقصى لساعات التدريس الأسبوعية ({max_w} حصة)."
                })


        return conflicts

    @classmethod
    def validate_and_add_entry(cls, tenant_id, timetable_id, day_of_week, period, teacher, subject_id, room_id, grade_section_id):
        """
        التحقق من صحة وخلو الحصة الدراسية من التعارضات ثم حجزها وتحديث النصاب
        """
        conflicts = cls.check_conflicts(
            tenant_id=tenant_id,
            timetable_id=timetable_id,
            day_of_week=day_of_week,
            period=period,
            teacher=teacher,
            subject_id=subject_id,
            room_id=room_id,
            grade_section_id=grade_section_id
        )

        entry = None
        if len(conflicts) == 0:
            entry = TimetableEntry.objects.create(
                tenant_id=tenant_id,
                timetable_id=timetable_id,
                day_of_week=day_of_week,
                period=period,
                teacher=teacher,
                subject_id=subject_id,
                room_id=room_id,
                grade_section_id=grade_section_id
            )
            # تحديث ساعات المعلم في جدول التحميل
            load, _ = TeachingLoad.objects.get_or_create(tenant_id=tenant_id, teacher=teacher)
            load.assigned_weekly_hours = (load.assigned_weekly_hours or 0) + 1
            load.save()

        return entry, conflicts

    @classmethod
    def swap_entries(cls, tenant_id, entry1_id, entry2_id):
        """
        التبديل التبادلي الذكي بين حصتين (Smart Swap) مع التحقق من عدم حدوث تعارضات
        """
        try:
            e1 = TimetableEntry.objects.get(id=entry1_id)
            e2 = TimetableEntry.objects.get(id=entry2_id)
        except TimetableEntry.DoesNotExist:
            return False, ["إحدى الحصتين غير موجودة."]

        # تحقق من إمكانية وضع e1 في موضع e2
        c1 = cls.check_conflicts(
            tenant_id=tenant_id,
            timetable_id=e1.timetable_id,
            day_of_week=e2.day_of_week,
            period=e2.period,
            teacher=e1.teacher,
            subject_id=e1.subject_id,
            room_id=e1.room_id,
            grade_section_id=e1.grade_section_id,
            exclude_entry_id=e1.id
        )
        # تحقق من إمكانية وضع e2 في موضع e1
        c2 = cls.check_conflicts(
            tenant_id=tenant_id,
            timetable_id=e2.timetable_id,
            day_of_week=e1.day_of_week,
            period=e1.period,
            teacher=e2.teacher,
            subject_id=e2.subject_id,
            room_id=e2.room_id,
            grade_section_id=e2.grade_section_id,
            exclude_entry_id=e2.id
        )

        all_c = c1 + c2
        if all_c:
            return False, [c['description'] for c in all_c]

        # تنفيذ التبديل
        d1, p1 = e1.day_of_week, e1.period
        d2, p2 = e2.day_of_week, e2.period

        e1.day_of_week, e1.period = d2, p2
        e2.day_of_week, e2.period = d1, p1

        e1.save()
        e2.save()
        return True, "تم تبديل الحصتين بنجاح."

    @classmethod
    def get_available_substitutes(cls, tenant_id, timetable_id, day_of_week, period_id, exclude_teacher_id=None):
        """
        استخراج المعلمين المتفرغين (ساعات فراغ) في حصة ويوم معين، مرتبين بالأقل نصاباً تدريسياً
        """
        # 1. جلب المعلمين المشغولين في هذه الفترة
        busy_teachers_query = TimetableEntry.objects.filter(
            timetable_id=timetable_id,
            day_of_week=day_of_week,
            period_id=period_id,
            deleted_at__isnull=True
        )
        if tenant_id:
            busy_teachers_query = busy_teachers_query.filter(tenant_id=tenant_id)
        
        busy_teacher_ids = set(busy_teachers_query.values_list('teacher_id', flat=True))
        if exclude_teacher_id:
            busy_teacher_ids.add(str(exclude_teacher_id))

        # 2. جلب جميع أعضاء هيئة التدريس النشطين
        teachers = FacultyMember.objects.filter(deleted_at__isnull=True)
        if tenant_id:
            teachers = teachers.filter(tenant_id=tenant_id)
        
        available = []
        for t in teachers:
            if str(t.id) in busy_teacher_ids:
                continue

            assigned_hours = 0
            max_hours = 24
            if hasattr(t, 'teaching_load') and t.teaching_load:
                assigned_hours = t.teaching_load.assigned_weekly_hours or 0
                max_hours = t.teaching_load.max_weekly_hours or 24

            available.append({
                'id': str(t.id),
                'name': t.full_name_ar or 'معلم',
                'teacher_code': t.teacher_code,
                'department': t.department,
                'assigned_hours': assigned_hours,
                'max_hours': max_hours,
                'load_pct': round((assigned_hours / max_hours) * 100) if max_hours else 0
            })

        # فرز المعلمين بالأقل تحميلاً
        available.sort(key=lambda x: x['assigned_hours'])
        return available

    @classmethod
    def auto_generate_school_timetable(cls, tenant_id, timetable_id, clear_existing=False):
        """
        محرك التوليد الآلي الذكي للجدول المدرسي الكامل (Master AI-Assisted Scheduler):
        يوزع أنصبة المواد على فصول المدرسة وفق قيود المعلمين والقاعات والأيام المعتمدة (الأحد-الخميس).
        """
        try:
            timetable = AcademicTimetable.objects.get(id=timetable_id)
        except AcademicTimetable.DoesNotExist:
            return {'success': False, 'message': 'الجدول غير موجود.'}

        if clear_existing:
            TimetableEntry.objects.filter(timetable_id=timetable_id).delete()
            # تصفير أحمال المعلمين
            TeachingLoad.objects.filter(tenant_id=tenant_id).update(assigned_weekly_hours=0)

        # أيام الأسبوع المعتمدة في السودان: 6=الأحد، 0=الاثنين، 1=الثلاثاء، 2=الأربعاء، 3=الخميس
        sudan_days = [6, 0, 1, 2, 3]

        # جلب الحصص الدراسية غير الاستراحات مرتبة
        periods = list(ClassPeriod.objects.filter(is_break=False, deleted_at__isnull=True).order_by('period_number'))
        if not periods:
            return {'success': False, 'message': 'يرجى تعريف الحصص الزمنية أولاً.'}

        # جلب مهام التدريس أو خطط التوزيع
        assignments = list(TeachingAssignment.objects.filter(deleted_at__isnull=True))
        if tenant_id:
            assignments = [a for a in assignments if getattr(a, 'tenant_id', None) == tenant_id or not getattr(a, 'tenant_id', None)]

        placed_count = 0
        unplaced = []

        occupied_teachers = set()
        occupied_sections = set()

        # قراءة الحصص الحالية الموجودة
        existing_entries = TimetableEntry.objects.filter(timetable_id=timetable_id, deleted_at__isnull=True)
        for ee in existing_entries:
            occupied_teachers.add((ee.day_of_week, str(ee.period_id), str(ee.teacher_id)))
            occupied_sections.add((ee.day_of_week, str(ee.period_id), str(ee.grade_section_id)))

        # خوارزمية التوزيع الذكي
        for assign in assignments:
            req_periods = assign.weekly_periods or 4
            teacher = assign.teacher
            section_id = str(assign.grade_section_id)
            subject_id = str(assign.subject_id)

            placed_for_assign = 0
            shuffled_days = sudan_days.copy()
            random.shuffle(shuffled_days)

            for day in shuffled_days:
                if placed_for_assign >= req_periods:
                    break

                for period in periods:
                    t_key = (day, str(period.id), str(teacher.id))
                    s_key = (day, str(period.id), section_id)

                    if t_key not in occupied_teachers and s_key not in occupied_sections:
                        TimetableEntry.objects.create(
                            tenant_id=tenant_id,
                            timetable=timetable,
                            day_of_week=day,
                            period=period,
                            teacher=teacher,
                            subject_id=subject_id,
                            grade_section_id=section_id,
                            room_id='00000000-0000-0000-0000-000000000000'
                        )
                        occupied_teachers.add(t_key)
                        occupied_sections.add(s_key)
                        placed_for_assign += 1
                        placed_count += 1
                        break

            if placed_for_assign < req_periods:
                unplaced.append({
                    'subject_id': subject_id,
                    'section_id': section_id,
                    'teacher_name': teacher.full_name_ar,
                    'remaining': req_periods - placed_for_assign
                })

        # إعادة احتساب وتحديث أحمال المعلمين
        all_teachers = FacultyMember.objects.filter(deleted_at__isnull=True)
        if tenant_id:
            all_teachers = all_teachers.filter(tenant_id=tenant_id)

        for t in all_teachers:
            count = TimetableEntry.objects.filter(timetable_id=timetable_id, teacher=t, deleted_at__isnull=True).count()
            load, _ = TeachingLoad.objects.get_or_create(tenant_id=tenant_id, teacher=t)
            load.assigned_weekly_hours = count
            load.save()

        return {
            'success': True,
            'placed_count': placed_count,
            'unplaced': unplaced,
            'message': f'تم توليد {placed_count} حصة بنجاح لكافة فصول المدرسة.'
        }