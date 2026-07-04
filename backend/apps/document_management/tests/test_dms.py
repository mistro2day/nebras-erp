import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from apps.document_management.domain.models import Document, DocumentFolder, DocumentVersion, DocumentLock
from apps.document_management.application.services import DmsLinkService

User = get_user_model()

class DocumentManagementTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        self.user = User.objects.create_user(username='dms_user', email='dms@nebras.com', password='password123')

        # إنشاء مجلد تجريبي
        self.folder = DocumentFolder.objects.create(
            name="مجلد الشؤون المالية", folder_type="shared", tenant_id=self.tenant_id
        )

        # ملف للرفع
        self.file_data = SimpleUploadedFile("invoice.pdf", b"pdfcontentcontent", content_type="application/pdf")

    def test_document_upload(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/documents/files/upload/', {
            'title': 'فاتورة المشتريات رقم 14',
            'folder': self.folder.id,
            'file': self.file_data
        }, format='multipart', HTTP_X_TENANT_ID=str(self.tenant_id))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'فاتورة المشتريات رقم 14')
        self.assertEqual(response.data['current_version_number'], '1.0')

    def test_document_lock_and_versioning(self):
        self.client.force_authenticate(user=self.user)
        # رفع الملف أولاً
        doc = Document.objects.create(
            title="سجل الموظفين", folder=self.folder, current_version_number='1.0', tenant_id=self.tenant_id
        )
        # قفل الملف
        response = self.client.post(f'/api/v1/documents/files/{doc.id}/lock/', HTTP_X_TENANT_ID=str(self.tenant_id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # التأكد من القفل بقاعدة البيانات
        doc.refresh_from_db()
        self.assertTrue(doc.is_locked)

        # فك قفل الملف
        response = self.client.post(f'/api/v1/documents/files/{doc.id}/unlock/', HTTP_X_TENANT_ID=str(self.tenant_id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        doc.refresh_from_db()
        self.assertFalse(doc.is_locked)

    def test_document_linking(self):
        doc = Document.objects.create(
            title="ملف المريض الطبي", folder=self.folder, current_version_number='1.0', tenant_id=self.tenant_id
        )
        entity_id = uuid.uuid4()
        
        # ربط الملف بزيارة طبية في العيادة
        ref = DmsLinkService.link_document(self.tenant_id, doc.id, 'clinic_visit', entity_id)
        self.assertEqual(ref.entity_type, 'clinic_visit')
        self.assertEqual(ref.entity_id, entity_id)

        # استرجاع المستندات المرتبطة
        docs = DmsLinkService.get_entity_documents(self.tenant_id, 'clinic_visit', entity_id)
        self.assertEqual(len(docs), 1)
        self.assertEqual(docs[0].title, "ملف المريض الطبي")

