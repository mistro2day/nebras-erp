from apps.scheduling.application.services import ConflictDetectionService
from apps.rules.application.services import RuleEvaluationService
from apps.timetable.domain.models import TimetableEntry, TeachingLoad
from datetime import date

class TimetableOrchestratorService:
    """
    منسق الجدول الدراسي مع محركات الجدولة وقواعد الأعمال الأساسية
    """

    @classmethod
    def validate_and_add_entry(cls, tenant_id, timetable_id, day_of_week, period, teacher, subject_id, room_id, grade_section_id):
        """
        التحقق من صحة وخلو الحصة الدراسية من التعارضات قبل إضافتها للجدول
        """
        # 1. التحقق من التعارضات عبر محرك الجدولة الموحد
        # نقوم بتحويل اليوم الدراسي إلى تاريخ افتراضي متوافق أو نستخدم فحص تداخل الموارد مباشرة
        conflicts = ConflictDetectionService.detect_conflicts_for_resource(
            resource_id=room_id,
            date_val=date.today(), # استخدام تاريخ افتراضي للفحص الدوري للجدول الأسبوعي
            start_time=period.start_time,
            end_time=period.end_time
        )
        
        # التحقق من تعارض المعلم أيضاً كمورد
        teacher_conflicts = ConflictDetectionService.detect_conflicts_for_resource(
            resource_id=teacher.id,
            date_val=date.today(),
            start_time=period.start_time,
            end_time=period.end_time
        )
        
        all_conflicts = conflicts + teacher_conflicts
        
        # 2. الاستعلام من محرك القواعد للتحقق من العبء التدريسي للمعلم (Rule Engine)
        # نقوم بتقييم قاعدة العبء التدريسي للمعلم ديناميكياً
        rule_context = {
            'teacher_weekly_hours': teacher.teaching_load.assigned_weekly_hours if hasattr(teacher, 'teaching_load') else 0,
            'max_allowed_hours': teacher.teaching_load.max_weekly_hours if hasattr(teacher, 'teaching_load') else 24
        }
        
        # إذا كان المعلم قد تجاوز الساعات المطلوبة، يتم رصد ذلك كتحذير أو كسر للقواعد
        has_rule_violation = rule_context['teacher_weekly_hours'] >= rule_context['max_allowed_hours']
        if has_rule_violation:
            all_conflicts.append({
                'conflict_type': 'teaching_load_exceeded',
                'description': f"المعلم {teacher.employee.full_name_ar} تجاوز الحد الأقصى لساعات التدريس الأسبوعية."
            })

        # إنشاء الحصة الدراسية في حال عدم وجود تعارض حرج، أو إرجاع التعارضات للمستخدم للموافقة والتعديل
        entry = None
        if len(all_conflicts) == 0:
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
            load, created = TeachingLoad.objects.get_or_create(tenant_id=tenant_id, teacher=teacher)
            load.assigned_weekly_hours += 1
            load.save()

        return entry, all_conflicts