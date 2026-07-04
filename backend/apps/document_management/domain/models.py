from django.db import models
from django.conf import settings
from apps.shared.domain.models import CombinedSharedModel

class StorageProvider(CombinedSharedModel):
    name = models.CharField(max_length=100)
    provider_type = models.CharField(max_length=50) # local, s3, azure, gcs, minio
    config = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_dms_storage_providers'


class StorageLocation(CombinedSharedModel):
    provider = models.ForeignKey(StorageProvider, on_delete=models.CASCADE)
    bucket_or_path = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_dms_storage_locations'


class DocumentFolder(CombinedSharedModel):
    name = models.CharField(max_length=150)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    folder_type = models.CharField(max_length=50, default='shared') # personal, shared, department, school
    department_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_dms_folders'


class FolderPermission(CombinedSharedModel):
    folder = models.ForeignKey(DocumentFolder, on_delete=models.CASCADE, related_name='permissions')
    role_id = models.UUIDField(null=True, blank=True)
    user_id = models.UUIDField(null=True, blank=True)
    can_read = models.BooleanField(default=True)
    can_write = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_dms_folder_permissions'


class DocumentCategory(CombinedSharedModel):
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'nebras_dms_categories'


class DocumentType(CombinedSharedModel):
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    extension = models.CharField(max_length=20) # pdf, docx, png, etc.

    class Meta:
        db_table = 'nebras_dms_types'


class Document(CombinedSharedModel):
    title = models.CharField(max_length=255)
    folder = models.ForeignKey(DocumentFolder, on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    category = models.ForeignKey(DocumentCategory, on_delete=models.SET_NULL, null=True)
    doc_type = models.ForeignKey(DocumentType, on_delete=models.SET_NULL, null=True)
    storage_location = models.ForeignKey(StorageLocation, on_delete=models.SET_NULL, null=True)
    current_version_number = models.CharField(max_length=20, default='1.0')
    is_locked = models.BooleanField(default=False)
    owner_id = models.UUIDField(null=True, blank=True)
    file_size_bytes = models.BigIntegerField(default=0)

    class Meta:
        db_table = 'nebras_dms_documents'


class DocumentVersion(CombinedSharedModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='versions')
    version_number = models.CharField(max_length=20)
    file_path = models.CharField(max_length=500)
    change_log = models.TextField(blank=True, null=True)
    author_id = models.UUIDField(null=True, blank=True)
    created_at_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_dms_document_versions'


class DocumentMetadata(CombinedSharedModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='metadata')
    meta_key = models.CharField(max_length=100)
    meta_value = models.TextField()

    class Meta:
        db_table = 'nebras_dms_document_metadata'


class DocumentTag(CombinedSharedModel):
    name = models.CharField(max_length=50)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='tags')

    class Meta:
        db_table = 'nebras_dms_document_tags'


class DocumentTemplate(CombinedSharedModel):
    name = models.CharField(max_length=150)
    category = models.ForeignKey(DocumentCategory, on_delete=models.CASCADE)
    template_file_path = models.CharField(max_length=500)

    class Meta:
        db_table = 'nebras_dms_templates'


class DocumentComment(CombinedSharedModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='comments')
    user_id = models.UUIDField()
    comment = models.TextField()

    class Meta:
        db_table = 'nebras_dms_comments'


class DocumentShare(CombinedSharedModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='shares')
    shared_by = models.UUIDField()
    shared_with = models.UUIDField(null=True, blank=True) # None implies link share
    permission_level = models.CharField(max_length=20, default='read') # read, write

    class Meta:
        db_table = 'nebras_dms_shares'


class DocumentLink(CombinedSharedModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    token = models.CharField(max_length=100, unique=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    max_downloads = models.IntegerField(default=0) # 0 means unlimited

    class Meta:
        db_table = 'nebras_dms_links'


class DocumentReference(CombinedSharedModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    entity_type = models.CharField(max_length=100) # student, teacher, invoice, contract
    entity_id = models.UUIDField()

    class Meta:
        db_table = 'nebras_dms_references'


class DocumentCheckout(CombinedSharedModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    user_id = models.UUIDField()
    checkout_at = models.DateTimeField(auto_now_add=True)
    expected_checkin = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_dms_checkouts'


class DocumentLock(CombinedSharedModel):
    document = models.OneToOneField(Document, on_delete=models.CASCADE, related_name='lock')
    locked_by = models.UUIDField()
    locked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_dms_locks'


class DocumentRetentionPolicy(CombinedSharedModel):
    category = models.ForeignKey(DocumentCategory, on_delete=models.CASCADE)
    retention_period_years = models.IntegerField()
    action_after_retention = models.CharField(max_length=50) # delete, archive

    class Meta:
        db_table = 'nebras_dms_retention_policies'


class DocumentArchive(CombinedSharedModel):
    document = models.OneToOneField(Document, on_delete=models.CASCADE)
    archived_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_dms_archive'


class DocumentSignature(CombinedSharedModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    signed_by = models.UUIDField()
    signed_at = models.DateTimeField(auto_now_add=True)
    signature_hash = models.CharField(max_length=255)

    class Meta:
        db_table = 'nebras_dms_signatures'


class DocumentApproval(CombinedSharedModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    approver_id = models.UUIDField()
    status = models.CharField(max_length=20, default='pending') # pending, approved, rejected
    decision_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_dms_approvals'


class DocumentWorkflow(CombinedSharedModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    workflow_id = models.UUIDField()
    current_state = models.CharField(max_length=50)

    class Meta:
        db_table = 'nebras_dms_workflows'


class DocumentFavorite(CombinedSharedModel):
    user_id = models.UUIDField()
    document = models.ForeignKey(Document, on_delete=models.CASCADE)

    class Meta:
        db_table = 'nebras_dms_favorites'


class DocumentSubscription(CombinedSharedModel):
    user_id = models.UUIDField()
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    events = models.JSONField(default=list) # notify on update, rename, delete

    class Meta:
        db_table = 'nebras_dms_subscriptions'


class DocumentAccessLog(CombinedSharedModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    user_id = models.UUIDField()
    access_type = models.CharField(max_length=20) # read, download, edit
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_dms_access_logs'


class DocumentAudit(CombinedSharedModel):
    user_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=150)
    details = models.TextField()

    class Meta:
        db_table = 'nebras_dms_audit'


class DocumentSettings(CombinedSharedModel):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_dms_settings'


class DocumentStatistics(CombinedSharedModel):
    total_documents = models.BigIntegerField(default=0)
    total_storage_bytes = models.BigIntegerField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_dms_statistics'
