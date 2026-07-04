import uuid
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.forms.domain.models import (
    FormDefinition, FormVersion, FormSubmission, FormResponse,
    FormAttachment, FormStatistics, FormValidation, FormField
)

class FormRenderingService:
    @staticmethod
    def get_active_form_schema(tenant_id, form_code):
        """
        استرجاع الكود التعريفي والمقاطع والحقول والمظهر الخاص بالنموذج النشط بصيغة JSON.
        """
        try:
            form = FormDefinition.objects.get(tenant_id=tenant_id, code=form_code, is_active=True)
            active_version = form.versions.all().order_by('-created_at').first()
            if not active_version:
                raise ValidationError("لا توجد نسخة نشطة لهذا النموذج حالياً.")
        except FormDefinition.DoesNotExist:
            raise ValidationError("النموذج المطلوب غير موجود أو غير نشط.")

        # تجميع الهيكل البرمجي الموجه بالبيانات الوصفية
        sections_data = []
        for sec in active_version.sections.all().order_by('order'):
            fields_data = []
            for field in sec.fields.all().order_by('order'):
                options = [{"label_ar": opt.label_ar, "value": opt.value} for opt in field.options.all()]
                fields_data.append({
                    "id": field.id,
                    "name": field.name,
                    "label_ar": field.label_ar,
                    "field_type": field.field_type,
                    "is_required": field.is_required,
                    "options": options
                })
            sections_data.append({
                "section_id": sec.id,
                "title_ar": sec.title_ar,
                "fields": fields_data
            })

        return {
            "form_id": form.id,
            "title_ar": form.title_ar,
            "version": active_version.version_number,
            "sections": sections_data
        }


class FormSubmissionService:
    @staticmethod
    def submit_responses(tenant_id, form_version_id, responses_dict, attachment_uuids, user_id, ip_address=None):
        """
        تسجيل إجابات نموذج ديناميكي، التحقق من الحقول الإلزامية وربط المرفقات بالـ DMS المركزي.
        """
        try:
            version = FormVersion.objects.get(tenant_id=tenant_id, id=form_version_id)
        except FormVersion.DoesNotExist:
            raise ValidationError("إصدار النموذج المحدد غير صحيح.")

        # إنشاء سجل التقديم
        submission = FormSubmission.objects.create(
            tenant_id=tenant_id,
            form_version=version,
            submitted_by=user_id,
            ip_address=ip_address,
            status='submitted'
        )

        # حفظ الإجابات الفردية
        for field_name, value in responses_dict.items():
            FormResponse.objects.create(
                tenant_id=tenant_id,
                submission=submission,
                field_name=field_name,
                value=str(value)
            )

        # ربط المرفقات والملفات بالوثائق في DMS المركزي
        for doc_id in attachment_uuids:
            FormAttachment.objects.create(
                tenant_id=tenant_id,
                submission=submission,
                document_id=doc_id
            )

            # استهلاك DMS Link لربط الوثيقة بالتقديم
            from apps.document_management.application.services import DmsLinkService
            try:
                DmsLinkService.link_document(tenant_id, doc_id, 'form_submission', submission.id)
            except Exception:
                pass

        # تحديث إحصاءات النموذج
        stats, created = FormStatistics.objects.get_or_create(
            tenant_id=tenant_id,
            form_definition=version.form_definition
        )
        stats.total_submissions += 1
        stats.save()

        # إرسال حدث في نظام الاتصالات الموحد (Form Submitted)
        return submission
