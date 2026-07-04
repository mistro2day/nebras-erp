import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.crm.domain.models import Lead, LeadSource, LeadStatus, Prospect, Contact, Case, Survey, Feedback

User = get_user_model()

class CrmTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        
        # إنشاء مستخدم للاختبارات
        self.user = User.objects.create_user(username='crm_user', email='crm@nebras.com', password='password123')

        # تهيئة مصادر وحالات العملاء
        self.source = LeadSource.objects.create(name_ar="الموقع الإلكتروني", name_en="Website", code="website", tenant_id=self.tenant_id)
        self.status = LeadStatus.objects.create(name_ar="جديد", name_en="New", code="new", tenant_id=self.tenant_id)

        # عميل محتمل للاختبار
        self.lead = Lead.objects.create(
            first_name="سالم", last_name="العلي", phone="0599999999", email="salem@email.com",
            source=self.source, status=self.status, tenant_id=self.tenant_id
        )

        # جهة اتصال وقضية
        self.contact = Contact.objects.create(first_name="أحمد", last_name="خالد", email="ahmad@email.com", phone="0500000000", tenant_id=self.tenant_id)
        self.case = Case.objects.create(contact=self.contact, subject="شكوى رسوم حافلة", description="لم يتم تفعيل الخدمة للابن", tenant_id=self.tenant_id)

    def test_crm_dashboard_access(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/crm/dashboard/', HTTP_X_TENANT_ID=str(self.tenant_id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('leads_count', response.data)
        self.assertIn('conversion_rate', response.data)

    def test_lead_conversion(self):
        self.client.force_authenticate(user=self.user)
        # تحويل Lead إلى Prospect
        response = self.client.post(f'/api/v1/crm/leads/{self.lead.id}/convert/', HTTP_X_TENANT_ID=str(self.tenant_id))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['first_name'], "سالم")
        self.assertEqual(response.data['stage'], "qualification")

    def test_case_escalation(self):
        self.client.force_authenticate(user=self.user)
        # تصعيد قضية الدعم الفني
        response = self.client.post(f'/api/v1/crm/cases/{self.case.id}/escalate/', HTTP_X_TENANT_ID=str(self.tenant_id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['priority'], 'high')
