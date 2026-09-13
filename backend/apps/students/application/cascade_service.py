import uuid
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from apps.common.exceptions import BusinessException
from apps.students.domain.models import (
    Student, StudentProfile, StudentEnrollment, StudentAttachment
)

class StudentCascadeService:
    """
    خدمة الحذف الجذري والشامل لملف الطالب وكافة متعلقاته عبر موديولات Nebras ERP.
    تتعامل بحذر وبترتيب دقيق لتفكيك قيود الحماية (models.PROTECT) في الحسابات المالية.
    """

    @classmethod
    def get_student_cascade_summary(cls, student_id: uuid.UUID, tenant_id: uuid.UUID) -> dict:
        student = Student.objects.filter(id=student_id, tenant_id=tenant_id).first()
        if not student:
            raise BusinessException("الطالب غير موجود.", code="student_not_found")

        student_name = ""
        student_number = student.student_number
        if hasattr(student, 'profile') and student.profile:
            student_name = student.profile.arabic_name or student.profile.english_name or ""

        summary = {
            "student_id": str(student.id),
            "student_name": student_name,
            "student_number": student_number,
            "finance": {
                "accounts_count": 0,
                "invoices_count": 0,
                "total_invoiced": 0.0,
                "receipts_count": 0,
                "total_collected": 0.0,
                "installments_count": 0,
                "receivables_count": 0,
                "has_financial_records": False
            },
            "academic": {
                "enrollments_count": 0,
                "exam_results_count": 0,
            },
            "documents": {
                "attachments_count": 0
            },
            "support_services": {
                "clinic_visits_count": 0,
                "library_borrows_count": 0
            },
            "total_records_count": 0
        }

        # 1. فحص مالية الطلاب
        try:
            from apps.student_finance.domain.models import (
                StudentBillingAccount, StudentInvoice, Receipt, Installment, StudentReceivable
            )
            accounts = StudentBillingAccount.objects.filter(student_id=student_id, tenant_id=tenant_id)
            summary["finance"]["accounts_count"] = accounts.count()

            if accounts.exists():
                invoices = StudentInvoice.objects.filter(student_billing_account__in=accounts)
                summary["finance"]["invoices_count"] = invoices.count()
                total_inv = invoices.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
                summary["finance"]["total_invoiced"] = float(total_inv)

                receipts = Receipt.objects.filter(student_billing_account__in=accounts)
                summary["finance"]["receipts_count"] = receipts.count()
                total_rec = receipts.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                summary["finance"]["total_collected"] = float(total_rec)

                installments = Installment.objects.filter(student_billing_account__in=accounts)
                summary["finance"]["installments_count"] = installments.count()

                receivables = StudentReceivable.objects.filter(student_billing_account__in=accounts)
                summary["finance"]["receivables_count"] = receivables.count()

                summary["finance"]["has_financial_records"] = (
                    summary["finance"]["invoices_count"] > 0 or
                    summary["finance"]["receipts_count"] > 0 or
                    summary["finance"]["accounts_count"] > 0
                )
        except Exception:
            pass

        # 2. فحص الأكاديمي والامتحانات
        try:
            summary["academic"]["enrollments_count"] = StudentEnrollment.objects.filter(
                student_id=student_id, tenant_id=tenant_id
            ).count()
        except Exception:
            pass

        try:
            from apps.examinations.domain.models import ExamResult
            summary["academic"]["exam_results_count"] = ExamResult.objects.filter(
                student_id=student_id, tenant_id=tenant_id
            ).count()
        except Exception:
            pass

        # 3. فحص المرفقات والوثائق
        try:
            summary["documents"]["attachments_count"] = StudentAttachment.objects.filter(
                student_id=student_id, tenant_id=tenant_id
            ).count()
        except Exception:
            pass

        # 4. فحص الخدمات المساندة (العيادة والمكتبة)
        try:
            from apps.clinic.domain.models import ClinicVisit
            summary["support_services"]["clinic_visits_count"] = ClinicVisit.objects.filter(
                patient_user_id=student_id, patient_type='student', tenant_id=tenant_id
            ).count()
        except Exception:
            pass

        try:
            from apps.library.domain.models import BorrowTransaction
            summary["support_services"]["library_borrows_count"] = BorrowTransaction.objects.filter(
                borrower_user_id=student_id, borrower_type='student', tenant_id=tenant_id
            ).count()
        except Exception:
            pass

        # إجمالي عدد السجلات المرتبطة
        total_records = (
            summary["finance"]["accounts_count"] +
            summary["finance"]["invoices_count"] +
            summary["finance"]["receipts_count"] +
            summary["finance"]["installments_count"] +
            summary["academic"]["enrollments_count"] +
            summary["academic"]["exam_results_count"] +
            summary["documents"]["attachments_count"] +
            summary["support_services"]["clinic_visits_count"] +
            summary["support_services"]["library_borrows_count"]
        )
        summary["total_records_count"] = total_records

        return summary

    @classmethod
    @transaction.atomic
    def execute_cascade_delete(cls, student_id: uuid.UUID, tenant_id: uuid.UUID, user_id: uuid.UUID | None = None) -> dict:
        """
        تنفيذ الحذف الذري الشامل لكافة متعلقات الطالب بجميع الموديولات.
        """
        student = Student.objects.filter(id=student_id, tenant_id=tenant_id).first()
        if not student:
            raise BusinessException("الطالب غير موجود أو تم حذفه مسبقاً.", code="student_not_found")

        deleted_summary = {
            "financial_receipts": 0,
            "financial_invoices": 0,
            "financial_accounts": 0,
            "exam_results": 0,
            "enrollments": 0,
            "attachments": 0,
            "clinic_visits": 0,
            "library_borrows": 0,
            "student_deleted": True
        }

        # 1. تصفية مالية الطلاب (بترتيب تفكيك قيود PROTECT)
        try:
            from apps.student_finance.domain.models import (
                StudentBillingAccount, StudentInvoice, InvoiceItem, InvoiceAdjustment,
                InvoiceDiscount, Receipt, PaymentAllocation, Installment, StudentReceivable,
                FinancialHold, Statement, Refund, CreditNote, DebitNote, OnlinePaymentRequest
            )
            accounts = StudentBillingAccount.objects.filter(student_id=student_id, tenant_id=tenant_id)
            if accounts.exists():
                account_ids = list(accounts.values_list('id', flat=True))

                # أ. حذف تخصيصات الدفع وسندات القبض
                receipts = Receipt.objects.filter(student_billing_account_id__in=account_ids)
                deleted_summary["financial_receipts"] = receipts.count()
                PaymentAllocation.objects.filter(receipt__in=receipts).delete()
                receipts.delete()

                # ب. حذف بنود وتعديلات الفواتير ثم الفواتير
                invoices = StudentInvoice.objects.filter(student_billing_account_id__in=account_ids)
                deleted_summary["financial_invoices"] = invoices.count()
                InvoiceItem.objects.filter(student_invoice__in=invoices).delete()
                InvoiceAdjustment.objects.filter(student_invoice__in=invoices).delete()
                InvoiceDiscount.objects.filter(student_invoice__in=invoices).delete()
                invoices.delete()

                # ج. حذف الأقساط والمستحقات والتنبيهات
                Installment.objects.filter(student_billing_account_id__in=account_ids).delete()
                StudentReceivable.objects.filter(student_billing_account_id__in=account_ids).delete()
                FinancialHold.objects.filter(student_billing_account_id__in=account_ids).delete()
                Statement.objects.filter(student_billing_account_id__in=account_ids).delete()
                try:
                    Refund.objects.filter(student_billing_account_id__in=account_ids).delete()
                    CreditNote.objects.filter(student_billing_account_id__in=account_ids).delete()
                    DebitNote.objects.filter(student_billing_account_id__in=account_ids).delete()
                    OnlinePaymentRequest.objects.filter(student_billing_account_id__in=account_ids).delete()
                except Exception:
                    pass

                # د. حذف الحسابات المالية نفسها
                deleted_summary["financial_accounts"] = accounts.count()
                accounts.delete()
        except Exception:
            pass

        # 2. حذف نتائج الامتحانات
        try:
            from apps.examinations.domain.models import ExamResult
            exam_res = ExamResult.objects.filter(student_id=student_id, tenant_id=tenant_id)
            deleted_summary["exam_results"] = exam_res.count()
            exam_res.delete()
        except Exception:
            pass

        # 3. حذف زيارات العيادة
        try:
            from apps.clinic.domain.models import ClinicVisit
            visits = ClinicVisit.objects.filter(patient_user_id=student_id, patient_type='student', tenant_id=tenant_id)
            deleted_summary["clinic_visits"] = visits.count()
            visits.delete()
        except Exception:
            pass

        # 4. حذف استعارات المكتبة
        try:
            from apps.library.domain.models import BorrowTransaction
            borrows = BorrowTransaction.objects.filter(borrower_user_id=student_id, borrower_type='student', tenant_id=tenant_id)
            deleted_summary["library_borrows"] = borrows.count()
            borrows.delete()
        except Exception:
            pass

        # 5. حذف وثائق ومرفقات الطالب
        try:
            attachments = StudentAttachment.objects.filter(student_id=student_id, tenant_id=tenant_id)
            deleted_summary["attachments"] = attachments.count()
            attachments.delete()
        except Exception:
            pass

        # 6. حذف سجلات التسكين الأكاديمي
        try:
            enrollments = StudentEnrollment.objects.filter(student_id=student_id, tenant_id=tenant_id)
            deleted_summary["enrollments"] = enrollments.count()
            enrollments.delete()
        except Exception:
            pass

        # 7. حذف سجل الطالب وسجلاته الشخصية نهائياً من قاعدة البيانات (Hard Delete)
        if hasattr(student, 'profile') and student.profile:
            student.profile.delete()
        if hasattr(student, 'medical_profile') and student.medical_profile:
            student.medical_profile.delete()

        student.delete()

        # 8. نشر حدث المجال في نظام التدقيق
        try:
            from apps.common.events import DomainEventPublisher
            DomainEventPublisher.publish("StudentCascadeDeleted", {
                "student_id": str(student_id),
                "tenant_id": str(tenant_id),
                "user_id": str(user_id) if user_id else None,
                "summary": deleted_summary
            })
        except Exception:
            pass

        return deleted_summary
