from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.admissions.domain.models import Applicant
from apps.workflow.models import WorkflowDefinition, WorkflowState, WorkflowInstance, WorkflowTransition
from apps.workflow.services import WorkflowEngine
from django.contrib.contenttypes.models import ContentType
import uuid
import datetime

class AdmissionsWorkflowTest(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.user_id = uuid.uuid4()
        
        # إنشاء طالب متقدم
        self.applicant = Applicant.objects.create(
            tenant_id=self.tenant_id,
            arabic_full_name="أحمد محمد",
            gender="male",
            date_of_birth=datetime.date(2020, 5, 10),
            nationality="سوداني",
            national_id="1234567890",
            academic_year_id=uuid.uuid4(),
            applying_grade_id=uuid.uuid4(),
            application_number="APP-2026-001"
        )
        
        # إعداد مسار العمل
        self.content_type = ContentType.objects.get_for_model(Applicant)
        self.workflow = WorkflowDefinition.objects.create(
            tenant_id=self.tenant_id,
            name="مسار قبول الطلاب",
            code="applicant_admission",
            content_type=self.content_type
        )
        
        # إنشاء الحالات
        self.draft_state = WorkflowState.objects.create(
            workflow=self.workflow, name="مسودة", code="draft", is_initial=True, tenant_id=self.tenant_id
        )
        self.submitted_state = WorkflowState.objects.create(
            workflow=self.workflow, name="تم التقديم", code="submitted", tenant_id=self.tenant_id
        )
        
        # إنشاء انتقال
        WorkflowTransition.objects.create(
            workflow=self.workflow,
            from_state=self.draft_state,
            to_state=self.submitted_state,
            trigger_action="submit",
            tenant_id=self.tenant_id
        )
        
        # إنشاء مثيل للطلب
        self.wf_instance = WorkflowInstance.objects.create(
            workflow=self.workflow,
            current_state=self.draft_state,
            content_type=self.content_type,
            object_id=self.applicant.id,
            tenant_id=self.tenant_id
        )

    def test_workflow_transition(self):
        """التحقق من إمكانية تنفيذ انتقال ناجح للحالة"""
        updated_instance = WorkflowEngine.trigger_transition(
            self.wf_instance.id,
            action="submit",
            user_id=self.user_id,
            comments="تم رفع الطلب بنجاح"
        )
        self.assertEqual(updated_instance.current_state.code, "submitted")