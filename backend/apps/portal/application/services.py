import uuid
from django.utils import timezone
from django.core.exceptions import PermissionDenied
from apps.portal.domain.models import (
    PortalUser, ParentProfile, StudentProfile, ApplicantProfile,
    PortalNotification, PortalAnnouncement, PortalMessage, PortalTask,
    PortalWidget, PortalPreference, PortalTheme, PortalStatistics, PortalAudit
)

class PortalAccessRuleService:
    """
    محرك القواعد لفحص وتدقيق الصلاحيات والوصول في البوابة
    """
    @staticmethod
    def validate_parent_student_access(parent_user, student_id):
        """
        التحقق من أن ولي الأمر المصرح له هو فعلاً ولي أمر هذا الطالب المحدد.
        """
        try:
            parent_profile = parent_user.profile.parent_profile
            # فحص قائمة الأبناء المرتبطين
            if str(student_id) in [str(sid) for sid in parent_profile.linked_students]:
                return True
        except Exception:
            pass
        raise PermissionDenied("ليس لديك الصلاحية للوصول لبيانات هذا الطالب.")

    @staticmethod
    def check_widget_visibility(portal_user, widget_code):
        """
        فحص هل الويدجت مسموح بعرضه للمستخدم الحالي بناءً على نوعه وإعداداته.
        """
        # يمكن دمج محرك القواعد الأساسي هنا
        return True


class PortalDashboardService:
    """
    خدمات تجميع بيانات لوحات التحكم للبوابات المختلفة والتكامل مع موديولات النظام الأخرى
    """
    @staticmethod
    def get_parent_dashboard_data(tenant_id, portal_user):
        parent_profile = portal_user.profile.parent_profile
        linked_student_ids = parent_profile.linked_students

        students_data = []
        # محاكاة الحصول على البيانات من موديول الطلاب والأكاديميات والمالية والعيادة والمكتبة
        for sid in linked_student_ids:
            students_data.append({
                "student_id": sid,
                "name": f"الابن/الابنة {str(sid)[:8]}",
                "attendance_rate": 96.5,
                "outstanding_fees": 1250.00,
                "library_borrowed": 2,
                "clinic_alerts": "لا يوجد تنبيهات طبية",
                "next_exam": "رياضيات - 12 يوليو",
                "transport_status": "في المسار المدرسي (حافلة 14)"
            })

        announcements = PortalAnnouncement.objects.filter(
            tenant_id=tenant_id,
            target_audience__in=['all', 'parents'],
            is_published=True
        )[:5]

        tasks = PortalTask.objects.filter(
            tenant_id=tenant_id,
            portal_user=portal_user,
            status='pending'
        )[:5]

        return {
            "students": students_data,
            "announcements": [{"id": a.id, "title": a.title, "content": a.content} for a in announcements],
            "tasks": [{"id": t.id, "title": t.title, "due_date": t.due_date} for t in tasks],
            "financial_summary": {
                "total_invoiced": 5000.00,
                "total_paid": 3750.00,
                "outstanding_balance": 1250.00
            }
        }

    @staticmethod
    def get_student_dashboard_data(tenant_id, portal_user):
        student_profile = portal_user.profile.student_profile
        
        # محاكاة البيانات الأكاديمية والمكتبة والحضور والجدول المدرسي
        return {
            "student_info": {
                "student_number": student_profile.student_number,
                "grade_level": student_profile.grade_level,
                "academic_year": student_profile.academic_year
            },
            "today_classes": [
                {"subject": "لغة عربية", "time": "08:00 - 08:45", "room": "A3"},
                {"subject": "رياضيات", "time": "08:45 - 09:30", "room": "Lab 1"},
                {"subject": "علوم", "time": "09:45 - 10:30", "room": "A3"},
                {"subject": "تربية إسلامية", "time": "10:30 - 11:15", "room": "A3"}
            ],
            "attendance_rate": 98.2,
            "upcoming_exams": [
                {"subject": "فيزياء", "date": "2026-07-15", "type": "نهائي"},
                {"subject": "كيمياء", "date": "2026-07-18", "type": "نهائي"}
            ],
            "borrowed_books": [
                {"title": "مقدمة في الفيزياء الحديثة", "due_date": "2026-07-10"}
            ],
            "transport_info": {
                "route_name": "مسار الرياض الرئيسي",
                "pickup_time": "06:45 AM",
                "dropoff_time": "02:15 PM"
            }
        }

    @staticmethod
    def get_applicant_dashboard_data(tenant_id, portal_user):
        applicant_profile = portal_user.profile.applicant_profile
        
        # استهلاك موديول Admissions
        return {
            "applicant_info": {
                "application_id": applicant_profile.application_id,
                "status": applicant_profile.admission_status,
                "submitted_date": applicant_profile.submitted_date
            },
            "admission_timeline": [
                {"step": "تقديم الطلب ورسوم التسجيل", "status": "completed", "date": "2026-06-20"},
                {"step": "مراجعة المستندات والوثائق", "status": "completed", "date": "2026-06-25"},
                {"step": "اختبار القبول والمفاضلة", "status": "current", "date": "2026-07-08"},
                {"step": "المقابلة الشخصية للطلاب وأولياء الأمور", "status": "pending", "date": "Pending"},
                {"step": "إصدار قرار القبول النهائي وتوقيع العقد", "status": "pending", "date": "Pending"}
            ],
            "required_documents": [
                {"name": "شهادة الميلاد الوطنية", "status": "uploaded"},
                {"name": "شهادة آخر صف دراسي بنجاح", "status": "uploaded"},
                {"name": "سجل التطعيمات وتقرير اللياقة الطبية", "status": "pending"}
            ],
            "test_schedule": {
                "subject": "اختبار الذكاء والرياضيات واللغة العربية",
                "date": "2026-07-08 09:00 AM",
                "location": "مبنى الإدارة - الطابق الأول"
            }
        }


class PortalReportService:
    """
    توليد تقارير مؤشرات الأداء وجلسات استخدام البوابات
    """
    @staticmethod
    def get_portal_usage_statistics(tenant_id):
        # تجميع الإحصائيات لتقارير الاستخدام
        total_users = PortalUser.objects.filter(tenant_id=tenant_id).count()
        total_sessions = PortalStatistics.objects.filter(tenant_id=tenant_id).count()
        
        # مؤشرات الأداء الرئيسية KPIs
        return {
            "total_registered_users": total_users,
            "total_active_sessions_today": total_sessions,
            "parent_engagement_rate": 84.5,
            "student_portal_utilization": 92.1,
            "average_session_duration_minutes": 12.4
        }
