from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel

# 1. Attachment Engine
class Attachment(CombinedSharedModel):
    entity_type = models.CharField(max_length=100, db_index=True)  # e.g., 'student', 'invoice'
    entity_id = models.UUIDField(db_index=True)
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)
    category = models.CharField(max_length=50, default='general', db_index=True)
    version_number = models.IntegerField(default=1)

    class Meta:
        db_table = 'nebras_attachments'
        indexes = [
            models.Index(fields=['tenant_id', 'entity_type', 'entity_id']),
        ]

class AttachmentVersion(CombinedSharedModel):
    attachment = models.ForeignKey(Attachment, on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField()
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField()

    class Meta:
        db_table = 'nebras_attachment_versions'


# 2. Comment Engine
class Comment(CombinedSharedModel):
    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.UUIDField(db_index=True)
    body = models.TextField()
    is_resolved = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')

    class Meta:
        db_table = 'nebras_comments'


# 3. Activity Timeline
class Activity(CombinedSharedModel):
    activity_type = models.CharField(max_length=50, db_index=True)  # e.g., 'create', 'update', 'approve'
    actor_id = models.UUIDField(db_index=True)
    actor_name = models.CharField(max_length=150)
    target_type = models.CharField(max_length=100, db_index=True)  # e.g., 'student'
    target_id = models.UUIDField(db_index=True)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'nebras_activities'


# 4. Approval Engine
class ApprovalRequest(CombinedSharedModel):
    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.UUIDField(db_index=True)
    status = models.CharField(max_length=30, default='pending', db_index=True) # pending, approved, rejected
    current_step = models.IntegerField(default=1)

    class Meta:
        db_table = 'nebras_approval_requests'

class ApprovalStep(CombinedSharedModel):
    request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE, related_name='steps')
    step_number = models.IntegerField()
    approver_role = models.CharField(max_length=100) # e.g. 'principal'
    status = models.CharField(max_length=30, default='pending') # pending, approved, rejected
    decision_by = models.UUIDField(null=True, blank=True)
    decision_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_approval_steps'


# 5. Tag Engine
class Tag(CombinedSharedModel):
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#6366f1') # hex code
    icon = models.CharField(max_length=50, blank=True, null=True)
    category = models.CharField(max_length=50, default='general', db_index=True)

    class Meta:
        db_table = 'nebras_tags'
        unique_together = ('tenant_id', 'name', 'category')

class EntityTag(CombinedSharedModel):
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)
    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.UUIDField(db_index=True)

    class Meta:
        db_table = 'nebras_entity_tags'
        unique_together = ('tenant_id', 'tag', 'entity_type', 'entity_id')


# 6. Notes Engine
class Note(CombinedSharedModel):
    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.UUIDField(db_index=True)
    body = models.TextField()
    is_private = models.BooleanField(default=True)
    is_pinned = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_notes'


# 7. Favorites Engine
class FavoriteFolder(CombinedSharedModel):
    name = models.CharField(max_length=100)

    class Meta:
        db_table = 'nebras_favorite_folders'

class Favorite(CombinedSharedModel):
    folder = models.ForeignKey(FavoriteFolder, on_delete=models.CASCADE, null=True, blank=True, related_name='items')
    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.UUIDField(db_index=True)
    title = models.CharField(max_length=255)
    link = models.CharField(max_length=500, blank=True, null=True)

    class Meta:
        db_table = 'nebras_favorites'


# 8. Lookup Engine
class LookupCategory(CombinedSharedModel):
    code = models.CharField(max_length=100) # e.g. 'nationality'
    name_ar = models.CharField(max_length=150)
    name_en = models.CharField(max_length=150)

    class Meta:
        db_table = 'nebras_lookup_categories'
        unique_together = ('tenant_id', 'code')

class LookupValue(CombinedSharedModel):
    category = models.ForeignKey(LookupCategory, on_delete=models.CASCADE, related_name='values')
    code = models.CharField(max_length=100) # e.g. 'SA'
    value_ar = models.CharField(max_length=255)
    value_en = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_lookup_values'
        unique_together = ('tenant_id', 'category', 'code')