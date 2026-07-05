import uuid
from django.test import TestCase

from apps.approval_center.domain.models import ApprovalCategory, ApprovalRequest, ApprovalComment, ApprovalAttachment
from apps.approval_center.application.services import ApprovalCollaborationService
from apps.document_management.domain.models import Document


class ApprovalCollaborationServiceTests(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.category = ApprovalCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='إجازة', name_en='Leave', code='LEAVE'
        )
        self.req = ApprovalRequest.objects.create(
            tenant_id=self.tenant_id, category=self.category, requester_id=uuid.uuid4(),
        )

    def test_add_comment(self):
        comment = ApprovalCollaborationService.add_comment(self.tenant_id, self.req.id, uuid.uuid4(), 'ملاحظة')
        self.assertTrue(ApprovalComment.objects.filter(id=comment.id).exists())

    def test_add_attachment_links_to_dms(self):
        document = Document.objects.create(tenant_id=self.tenant_id, title='مستند تجريبي', file_size_bytes=1024)
        attachment = ApprovalCollaborationService.add_attachment(self.tenant_id, self.req.id, document.id)
        self.assertTrue(ApprovalAttachment.objects.filter(id=attachment.id).exists())

        results = ApprovalCollaborationService.list_attachments_with_documents(self.tenant_id, self.req.id)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], 'مستند تجريبي')
        self.assertEqual(results[0]['file_size_bytes'], 1024)

    def test_add_attachment_with_missing_document_does_not_raise(self):
        attachment = ApprovalCollaborationService.add_attachment(self.tenant_id, self.req.id, uuid.uuid4())
        self.assertTrue(ApprovalAttachment.objects.filter(id=attachment.id).exists())
