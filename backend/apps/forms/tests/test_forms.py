import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.forms.domain.models import FormDefinition, FormVersion, FormCategory, FormSection, FormField

User = get_user_model()

class FormsPlatformTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        self.user = User.objects.create_user(username='forms_user', email='forms@nebras.com', password='password123')

        # إنشاء تصنيف
        self.category = FormCategory.objects.create(
            name_ar="النماذج الأكاديمية", name_en="Academic Forms", code="acad-forms", tenant_id=self.tenant_id
        )

        # إنشاء تعريف النموذج
        self.form_def = FormDefinition.objects.create(
            title_ar="طلب تسجيل مقرر اختياري", code="elect-course-req", category=self.category, tenant_id=self.tenant_id
        )

        # إنشاء النسخة
        self.form_ver = FormVersion.objects.create(
            form_definition=self.form_def, version_number="1.0", schema_json={}, tenant_id=self.tenant_id
        )

        # إنشاء مقطع وحقل
        self.section = FormSection.objects.create(
            form_version=self.form_ver, title_ar="البيانات الأساسية", order=1, tenant_id=self.tenant_id
        )

        self.field = FormField.objects.create(
            section=self.section, label_ar="اسم المقرر", field_type="text", name="course_name",
            is_required=True, order=1, tenant_id=self.tenant_id
        )

    def test_render_form_metadata(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            f'/api/v1/forms/definitions/render/{self.form_def.code}/', HTTP_X_TENANT_ID=str(self.tenant_id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title_ar'], "طلب تسجيل مقرر اختياري")
        self.assertEqual(len(response.data['sections']), 1)
        self.assertEqual(response.data['sections'][0]['fields'][0]['name'], 'course_name')

    def test_submit_form_response(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'form_version': self.form_ver.id,
            'responses': {
                'course_name': 'الذكاء الاصطناعي المتقدم'
            },
            'attachments': []
        }
        response = self.client.post(
            '/api/v1/forms/submissions/submit/', payload, format='json', HTTP_X_TENANT_ID=str(self.tenant_id)
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'submitted')
