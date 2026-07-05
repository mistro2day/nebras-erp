"""
Low-Code / No-Code metadata models.

These are *metadata definitions* that describe entities, forms, pages, widgets,
APIs and modules the platform can generate. Generation produces artifacts that
respect Nebras DDD (domain/application/interfaces) — it never bypasses the
architecture. Dynamic form definitions reuse ``apps.forms`` where possible; the
``FormDefinition`` here is a thin low-code binding referencing a forms record.
"""
from django.db import models
from apps.shared.domain.models import CombinedSharedModel


class EntityDefinition(CombinedSharedModel):
    """تعريف كيان منخفض الشيفرة (Entity Builder)."""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    label_ar = models.CharField(max_length=200, blank=True, null=True)
    label_en = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    module_code = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    is_tenant_scoped = models.BooleanField(default=True)
    soft_delete = models.BooleanField(default=True)
    enable_audit = models.BooleanField(default=True)
    status = models.CharField(max_length=20, default='draft')  # draft|generated|active
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'nebras_ap_entity_definitions'


class EntityField(CombinedSharedModel):
    """حقل ضمن تعريف الكيان."""
    FIELD_TYPES = (
        ('string', 'نص'), ('text', 'نص طويل'), ('integer', 'عدد صحيح'),
        ('decimal', 'عدد عشري'), ('boolean', 'منطقي'), ('date', 'تاريخ'),
        ('datetime', 'تاريخ ووقت'), ('uuid', 'معرف'), ('json', 'JSON'),
        ('foreignkey', 'علاقة'), ('choice', 'قائمة اختيار'),
    )
    entity = models.ForeignKey(EntityDefinition, on_delete=models.CASCADE, related_name='fields')
    name = models.CharField(max_length=100)
    field_type = models.CharField(max_length=30, choices=FIELD_TYPES)
    label = models.CharField(max_length=200, blank=True, null=True)
    required = models.BooleanField(default=False)
    unique = models.BooleanField(default=False)
    default_value = models.CharField(max_length=255, blank=True, null=True)
    related_entity_code = models.CharField(max_length=100, blank=True, null=True)
    choices = models.JSONField(default=list, blank=True)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_ap_entity_fields'
        ordering = ['order']


class RelationshipDefinition(CombinedSharedModel):
    """علاقة بين كيانين (Relationship Builder)."""
    REL_TYPES = (('one_to_many', '1..*'), ('many_to_one', '*..1'),
                 ('one_to_one', '1..1'), ('many_to_many', '*..*'))
    source_entity_code = models.CharField(max_length=100, db_index=True)
    target_entity_code = models.CharField(max_length=100, db_index=True)
    relation_type = models.CharField(max_length=20, choices=REL_TYPES)
    related_name = models.CharField(max_length=100, blank=True, null=True)
    on_delete = models.CharField(max_length=20, default='cascade')

    class Meta:
        db_table = 'nebras_ap_relationship_definitions'


class ValidationDefinition(CombinedSharedModel):
    """قاعدة تحقق مُعرّفة على كيان/حقل (Validation Builder)."""
    entity_code = models.CharField(max_length=100, db_index=True)
    field_name = models.CharField(max_length=100, blank=True, null=True)
    expression = models.TextField()   # تعبير التحقق
    error_message = models.CharField(max_length=255)
    severity = models.CharField(max_length=20, default='error')

    class Meta:
        db_table = 'nebras_ap_validation_definitions'


class CrudDefinition(CombinedSharedModel):
    """تعريف واجهة CRUD مولّدة لكيان (CRUD Builder)."""
    entity = models.ForeignKey(EntityDefinition, on_delete=models.CASCADE, related_name='crud_definitions')
    enable_create = models.BooleanField(default=True)
    enable_read = models.BooleanField(default=True)
    enable_update = models.BooleanField(default=True)
    enable_delete = models.BooleanField(default=True)
    list_fields = models.JSONField(default=list, blank=True)
    search_fields = models.JSONField(default=list, blank=True)
    api_base_path = models.CharField(max_length=200, blank=True, null=True)

    class Meta:
        db_table = 'nebras_ap_crud_definitions'


class FormDefinition(CombinedSharedModel):
    """
    ربط منخفض الشيفرة بنموذج ديناميكي (Form Builder).
    يُفضَّل إعادة استخدام apps.forms؛ هذا السجل يربط تعريف الواجهة بسجل النموذج.
    """
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    entity_code = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    forms_platform_id = models.UUIDField(null=True, blank=True, db_index=True)  # apps.forms ref
    schema = models.JSONField(default=dict, blank=True)   # حقول/أقسام/شروط
    conditional_logic = models.JSONField(default=list, blank=True)
    calculated_fields = models.JSONField(default=list, blank=True)
    lookup_fields = models.JSONField(default=list, blank=True)
    workflow_diagram_id = models.UUIDField(null=True, blank=True)
    version = models.IntegerField(default=1)
    status = models.CharField(max_length=20, default='draft')

    class Meta:
        db_table = 'nebras_ap_form_definitions'


class PageDefinition(CombinedSharedModel):
    """تعريف صفحة/لوحة مولّدة (Page & Dashboard Builder)."""
    PAGE_TYPES = (('list', 'قائمة'), ('detail', 'تفصيل'), ('dashboard', 'لوحة'),
                  ('wizard', 'معالج'), ('report', 'تقرير'), ('custom', 'مخصص'))
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    page_type = models.CharField(max_length=20, choices=PAGE_TYPES, default='custom')
    route = models.CharField(max_length=200, blank=True, null=True)
    layout = models.JSONField(default=dict, blank=True)  # widgets/grid
    permission_code = models.CharField(max_length=150, blank=True, null=True)
    status = models.CharField(max_length=20, default='draft')

    class Meta:
        db_table = 'nebras_ap_page_definitions'


class WidgetDefinition(CombinedSharedModel):
    """عنصر واجهة قابل لإعادة الاستخدام (Widget Builder)."""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    widget_type = models.CharField(max_length=50)  # chart|table|kpi|list|form|custom
    data_source = models.JSONField(default=dict, blank=True)
    options = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'nebras_ap_widget_definitions'


class ApiDefinition(CombinedSharedModel):
    """تعريف نقطة API مولّدة (API Builder)."""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    method = models.CharField(max_length=10, default='GET')
    path = models.CharField(max_length=200)
    entity_code = models.CharField(max_length=100, blank=True, null=True)
    handler_type = models.CharField(max_length=30, default='crud')  # crud|rule|workflow|custom
    config = models.JSONField(default=dict, blank=True)
    permission_code = models.CharField(max_length=150, blank=True, null=True)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_ap_api_definitions'


class ModuleDefinition(CombinedSharedModel):
    """تعريف موديول منخفض الشيفرة يجمع كيانات وصفحات وواجهات (Module Builder)."""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    entities = models.JSONField(default=list, blank=True)   # entity codes
    pages = models.JSONField(default=list, blank=True)
    apis = models.JSONField(default=list, blank=True)
    icon = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, default='draft')

    class Meta:
        db_table = 'nebras_ap_module_definitions'


class MetadataRegistry(CombinedSharedModel):
    """سجل بيانات وصفية عام (Metadata Builder) — key/value مُصنّف."""
    namespace = models.CharField(max_length=100, db_index=True)
    key = models.CharField(max_length=150, db_index=True)
    value = models.JSONField(default=dict, blank=True)
    locale = models.CharField(max_length=10, blank=True, null=True)  # للتوطين (Localization Builder)

    class Meta:
        db_table = 'nebras_ap_metadata_registry'
        unique_together = ('namespace', 'key', 'locale')


class GeneratedArtifact(CombinedSharedModel):
    """أثر مولّد (Generated Artifact) — كود/تعريف تم توليده من منصة Low-Code."""
    source_type = models.CharField(max_length=30)  # entity|form|page|api|module
    source_id = models.UUIDField(db_index=True)
    artifact_type = models.CharField(max_length=30)  # model|serializer|view|route|component
    file_path = models.CharField(max_length=300, blank=True, null=True)
    content = models.TextField(blank=True, null=True)
    is_applied = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_ap_generated_artifacts'
