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
        """لوحة الطالب ببيانات حقيقية: معلوماته، وضعه المالي، درجاته، وحضوره.

        يستبدل المحاكاة السابقة بمصادر فعلية (student_finance / examinations /
        attendance). الأقسام التي لا بيانات لها تُرجَع فارغة لا وهمية.
        """
        sp = getattr(getattr(portal_user, 'profile', None), 'student_profile', None)
        student_id = str(sp.student_id) if sp and getattr(sp, 'student_id', None) else None

        info = {
            "student_number": getattr(sp, 'student_number', None),
            "grade_level": getattr(sp, 'grade_level', None),
            "academic_year": getattr(sp, 'academic_year', None),
            "name": StudentPortalService.student_name(student_id),
        }
        return {
            "student_info": info,
            "finance": ParentPortalService._finance_summary(tenant_id, student_id)
            if student_id else {},
            "grades": StudentPortalService.grades(tenant_id, student_id),
            "attendance": StudentPortalService.attendance_summary(tenant_id, student_id),
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

        # العناوين
        addresses = [{
            'id': str(a.id), 'address_type': a.address_type,
            'line1': a.address_line1, 'line2': a.address_line2 or '',
            'city': a.city, 'state': a.state or '', 'country': a.country,
            'postal_code': a.postal_code or '',
        } for a in s.addresses.all()]

        # جهات الطوارئ
        emergency = [{
            'id': str(c.id), 'name': c.name, 'relationship': c.relationship,
            'phone': c.phone, 'email': c.email or '', 'is_primary': c.is_primary,
        } for c in s.emergency_contacts.all()]

        # الحالة الصحية (مرجعها العيادة)
        medical = {}
        try:
            from apps.clinic.application.profile_service import read_intake
            intake = read_intake(tenant_id, 'student', s.id)
            medical = {
                'blood_group': intake.get('blood_group') or getattr(profile, 'blood_group', '') or '',
                'allergies': intake.get('allergies') or [],
                'chronic_diseases': intake.get('chronic_diseases') or [],
                'medication': intake.get('medication') or [],
                'disabilities': intake.get('disabilities') or [],
                'medical_notes': intake.get('medical_notes') or '',
            }
        except Exception:
            medical = {'blood_group': getattr(profile, 'blood_group', '') or ''}

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
                'passport': getattr(profile, 'passport', '') or '',
                'blood_group': getattr(profile, 'blood_group', '') or '',
                'religion': getattr(profile, 'religion', '') or '',
                'languages': getattr(profile, 'languages', []) or [],
                'special_needs': getattr(profile, 'special_needs', '') or '',
                'learning_difficulty': getattr(profile, 'learning_difficulty', '') or '',
                'talented_program': getattr(profile, 'talented_program', '') or '',
                'notes': getattr(profile, 'notes', '') or '',
            },
            'grade_level': cls._grade_label(portal_user, s),
            'finance': {
                **fin,
                'invoices': invoices,
                'receipts': receipts,
                'online_payments': payments,
            },
            'family_relations': family,
            'addresses': addresses,
            'emergency_contacts': emergency,
            'medical': medical,
        }


class StudentPortalService:
    """خدمة بيانات بوابة الطالب: الاسم، الدرجات الحقيقية، وملخّص الحضور."""

    @staticmethod
    def student_name(student_id):
        if not student_id:
            return None
        try:
            from apps.students.domain.models import Student
            s = Student.objects.filter(id=student_id, deleted_at__isnull=True).select_related('profile').first()
            if s:
                return getattr(getattr(s, 'profile', None), 'arabic_name', None) or None
        except Exception:
            pass
        return None

    @staticmethod
    def grades(tenant_id, student_id):
        """درجات الطالب الفعلية من سجلّات الامتحانات (StudentMark)."""
        if not student_id:
            return []
        try:
            from apps.examinations.domain.models import StudentMark
            marks = StudentMark.objects.filter(
                tenant_id=tenant_id,
                student_exam__student_id=student_id,
                deleted_at__isnull=True,
            ).select_related('student_exam__schedule__exam').order_by('-created_at')[:30]
            out = []
            for m in marks:
                try:
                    exam = m.student_exam.schedule.exam
                except Exception:
                    continue
                obtained = float(m.marks_obtained)
                pass_marks = float(exam.pass_marks)
                out.append({
                    'exam_name': exam.name,
                    'term': exam.term,
                    'academic_year': exam.academic_year,
                    'marks_obtained': obtained,
                    'max_marks': float(exam.max_marks),
                    'pass_marks': pass_marks,
                    'is_present': m.is_present,
                    'passed': m.is_present and obtained >= pass_marks,
                })
            return out
        except Exception:
            return []

    @staticmethod
    def attendance_summary(tenant_id, student_id):
        """ملخّص حضور الطالب الفعلي من السجلّ اليومي."""
        empty = {'total': 0, 'present': 0, 'absent': 0, 'rate': 0.0, 'recent': []}
        if not student_id:
            return empty
        try:
            from apps.attendance.domain.models import StudentDailyAttendance
            recs = StudentDailyAttendance.objects.filter(
                tenant_id=tenant_id, student_id=student_id, deleted_at__isnull=True)
            total = recs.count()
            if total == 0:
                return empty
            present = recs.filter(status='present').count()
            absent = recs.filter(status='absent').count()
            recent = [
                {'date': str(r.date), 'status': r.status}
                for r in recs.order_by('-date')[:12]
            ]
            return {
                'total': total,
                'present': present,
                'absent': absent,
                'rate': round(present / total * 100, 1),
                'recent': recent,
            }
        except Exception:
            return empty


class TeacherPortalService:
    """خدمة بوابة المعلّم: يُعرَّف المعلّم من بريد حسابه، ويرى فصوله الحقيقية وطلابها."""

    @staticmethod
    def resolve_faculty_member(tenant_id, user):
        """يربط حساب المستخدم بعضو هيئة التدريس عبر بريد الموظّف."""
        email = getattr(user, 'email', None)
        if not email:
            return None
        try:
            from apps.employees.domain.models import Employee
            from apps.faculty.domain.models import FacultyMember
            emp = Employee.objects.filter(tenant_id=tenant_id, email__iexact=email,
                                          deleted_at__isnull=True).first()
            if not emp:
                return None
            return FacultyMember.objects.filter(tenant_id=tenant_id, employee_id=emp.id,
                                                deleted_at__isnull=True).first()
        except Exception:
            return None

    @staticmethod
    def _subject_name(tenant_id, subject_id, cache):
        if subject_id in cache:
            return cache[subject_id]
        name = None
        try:
            from apps.academics.domain.subjects import Subject
            s = Subject.objects.filter(id=subject_id).first()
            name = s.arabic_name if s else None
        except Exception:
            pass
        cache[subject_id] = name
        return name

    @staticmethod
    def _section_info(tenant_id, section_id, cache):
        if section_id in cache:
            return cache[section_id]
        info = {'name': None, 'grade': None, 'students': 0}
        try:
            from apps.academics.domain.models import Section
            sec = Section.objects.filter(id=section_id).select_related('grade').first()
            if sec:
                info = {
                    'name': sec.name,
                    'grade': sec.grade.name if sec.grade_id else None,
                    'students': sec.occupied_seats,
                }
        except Exception:
            pass
        cache[section_id] = info
        return info

    @classmethod
    def get_dashboard(cls, tenant_id, user):
        fm = cls.resolve_faculty_member(tenant_id, user)
        if not fm:
            return None
        from apps.faculty.domain.models import TeacherAssignment
        subj_cache, sec_cache = {}, {}
        assignments = TeacherAssignment.objects.filter(
            tenant_id=tenant_id, faculty_member_id=fm.id, deleted_at__isnull=True)
        classes = []
        total_students = 0
        for a in assignments:
            sec = cls._section_info(tenant_id, a.section_id, sec_cache)
            total_students += sec['students'] or 0
            classes.append({
                'assignment_id': str(a.id),
                'subject': cls._subject_name(tenant_id, a.subject_id, subj_cache) or 'مادة',
                'section_id': str(a.section_id),
                'section': sec['name'],
                'grade': sec['grade'],
                'students': sec['students'],
                'weekly_hours': a.weekly_hours,
            })
        return {
            'teacher_info': {
                'name': fm.full_name_ar,
                'employee_number': fm.employee_number,
                'email': fm.email,
            },
            'summary': {
                'classes': len(classes),
                'total_students': total_students,
                'weekly_hours': sum(c['weekly_hours'] for c in classes),
            },
            'classes': classes,
        }

    @classmethod
    def get_section_students(cls, tenant_id, user, section_id):
        """قائمة طلاب شعبة يدرّسها المعلّم (بعد التحقّق من إسناده لها)."""
        fm = cls.resolve_faculty_member(tenant_id, user)
        if not fm:
            return None
        from apps.faculty.domain.models import TeacherAssignment
        allowed = TeacherAssignment.objects.filter(
            tenant_id=tenant_id, faculty_member_id=fm.id,
            section_id=section_id, deleted_at__isnull=True).exists()
        if not allowed:
            raise PermissionDenied('هذه الشعبة ليست ضمن إسناداتك.')

        from apps.students.domain.models import StudentEnrollment, Student
        ids = list(StudentEnrollment.objects.filter(
            tenant_id=tenant_id, section_id=section_id, status='active',
            deleted_at__isnull=True).values_list('student_id', flat=True).distinct())
        students = Student.objects.filter(id__in=ids, deleted_at__isnull=True).select_related('profile')
        out = []
        for s in students:
            profile = getattr(s, 'profile', None)
            out.append({
                'student_id': str(s.id),
                'student_number': s.student_number,
                'name': getattr(profile, 'arabic_name', '') or '—',
                'gender': getattr(profile, 'gender', '') or '',
            })
        out.sort(key=lambda x: x['name'])
        return {'students': out, 'count': len(out)}


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
