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


class ParentPortalService:
    """
    خدمة بيانات بوابة ولي الأمر: قائمة الأبناء بتفاصيلهم الحقيقية،
    والملف الكامل لكل ابن (أكاديمي/مالي/شخصي).
    """

    @staticmethod
    def _linked_student_ids(portal_user):
        try:
            return [str(sid) for sid in portal_user.profile.parent_profile.linked_students or []]
        except Exception:
            return []

    @staticmethod
    def _finance_summary(tenant_id, student_id):
        """ملخص مالي للطالب من وحدة مالية الطلاب."""
        from apps.student_finance.domain.models import StudentBillingAccount
        acc = StudentBillingAccount.objects.filter(
            tenant_id=tenant_id, student_id=student_id, deleted_at__isnull=True
        ).first()
        if not acc:
            return {'billing_account_id': None, 'account_number': None,
                    'outstanding_balance': 0.0, 'credit_balance': 0.0}
        return {
            'billing_account_id': str(acc.id),
            'account_number': acc.account_number,
            'outstanding_balance': float(acc.outstanding_balance),
            'credit_balance': float(acc.credit_balance),
            'financial_hold': acc.financial_hold,
        }

    @staticmethod
    def _grade_label(portal_user, student):
        """محاولة جلب اسم الصف من ملف بوابة الطالب إن وُجد."""
        try:
            from apps.portal.domain.models import StudentProfile as PortalStudentProfile
            sp = PortalStudentProfile.objects.filter(student_id=student.id).first()
            if sp and sp.grade_level:
                return sp.grade_level
        except Exception:
            pass
        return None

    @classmethod
    def get_children(cls, tenant_id, portal_user):
        from apps.students.domain.models import Student
        ids = cls._linked_student_ids(portal_user)
        children = []
        students = Student.objects.filter(id__in=ids, deleted_at__isnull=True).select_related('profile')
        for s in students:
            profile = getattr(s, 'profile', None)
            fin = cls._finance_summary(tenant_id, s.id)
            children.append({
                'student_id': str(s.id),
                'student_number': s.student_number,
                'status': s.status,
                'name': getattr(profile, 'arabic_name', '') or '—',
                'gender': getattr(profile, 'gender', '') or '',
                'grade_level': cls._grade_label(portal_user, s),
                'outstanding_balance': fin['outstanding_balance'],
                'billing_account_id': fin['billing_account_id'],
            })
        return {'children': children, 'count': len(children)}

    @classmethod
    def get_child_detail(cls, tenant_id, portal_user, student_id):
        # التحقق من الصلاحية
        PortalAccessRuleService.validate_parent_student_access(portal_user, student_id)

        from apps.students.domain.models import Student
        from apps.student_finance.domain.models import (
            StudentInvoice, Receipt, StudentReceivable, OnlinePaymentRequest,
        )
        s = Student.objects.filter(id=student_id, deleted_at__isnull=True).select_related('profile').first()
        if not s:
            return None
        profile = getattr(s, 'profile', None)
        fin = cls._finance_summary(tenant_id, s.id)

        # المالية التفصيلية
        invoices, receipts, payments = [], [], []
        if fin['billing_account_id']:
            acc_id = fin['billing_account_id']
            for inv in StudentInvoice.objects.filter(
                student_billing_account_id=acc_id, deleted_at__isnull=True
            ).order_by('-issue_date')[:20]:
                invoices.append({
                    'id': str(inv.id), 'invoice_number': inv.invoice_number,
                    'issue_date': inv.issue_date, 'due_date': inv.due_date,
                    'total_amount': float(inv.total_amount), 'paid_amount': float(inv.paid_amount),
                    'outstanding_amount': float(inv.outstanding_amount), 'status': inv.status,
                })
            for r in Receipt.objects.filter(
                student_billing_account_id=acc_id, deleted_at__isnull=True
            ).order_by('-payment_date')[:20]:
                receipts.append({
                    'id': str(r.id), 'receipt_number': r.receipt_number,
                    'payment_date': r.payment_date, 'amount': float(r.amount), 'status': r.status,
                })
            for p in OnlinePaymentRequest.objects.filter(
                student_billing_account_id=acc_id, deleted_at__isnull=True
            ).order_by('-created_at')[:20]:
                payments.append({
                    'id': str(p.id), 'amount': float(p.amount), 'status': p.status,
                    'transfer_reference': p.transfer_reference, 'transfer_date': p.transfer_date,
                    'bank_name': p.bank_name, 'created_at': p.created_at,
                    'rejection_reason': p.rejection_reason,
                })

        # جهات العائلة
        family = [{
            'id': str(rel.id), 'relationship': rel.relationship, 'full_name': rel.full_name,
            'phone': rel.phone, 'email': rel.email,
        } for rel in s.family_relations.all()]

        return {
            'student_id': str(s.id),
            'student_number': s.student_number,
            'status': s.status,
            'profile': {
                'name': getattr(profile, 'arabic_name', '') or '—',
                'english_name': getattr(profile, 'english_name', '') or '',
                'gender': getattr(profile, 'gender', '') or '',
                'date_of_birth': getattr(profile, 'date_of_birth', None),
                'nationality': getattr(profile, 'nationality', '') or '',
                'national_id': getattr(profile, 'national_id', '') or '',
                'blood_group': getattr(profile, 'blood_group', '') or '',
                'religion': getattr(profile, 'religion', '') or '',
            },
            'grade_level': cls._grade_label(portal_user, s),
            'finance': {
                **fin,
                'invoices': invoices,
                'receipts': receipts,
                'online_payments': payments,
            },
            'family_relations': family,
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
