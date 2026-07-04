from django.db import models
from django.conf import settings
from apps.shared.domain.models import CombinedSharedModel

class FormCategory(CombinedSharedModel):
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'nebras_forms_categories'


class FormDefinition(CombinedSharedModel):
    title_ar = models.CharField(max_length=200)
    title_en = models.CharField(max_length=200, blank=True, null=True)
    category = models.ForeignKey(FormCategory, on_delete=models.SET_NULL, null=True, related_name='forms')
    code = models.CharField(max_length=100, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)
    current_version_number = models.CharField(max_length=20, default='1.0')

    class Meta:
        db_table = 'nebras_forms_definitions'


class FormVersion(CombinedSharedModel):
    form_definition = models.ForeignKey(FormDefinition, on_delete=models.CASCADE, related_name='versions')
    version_number = models.CharField(max_length=20)
    schema_json = models.JSONField(default=dict)
    change_log = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_forms_versions'


class FormSection(CombinedSharedModel):
    form_version = models.ForeignKey(FormVersion, on_delete=models.CASCADE, related_name='sections')
    title_ar = models.CharField(max_length=150)
    title_en = models.CharField(max_length=150, blank=True, null=True)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_forms_sections'


class FormField(CombinedSharedModel):
    FIELD_TYPES = (
        ('text', 'نص قصير'),
        ('textarea', 'نص طويل'),
        ('number', 'رقم'),
        ('date', 'تاريخ'),
        ('select', 'اختيار من متعدد'),
        ('checkbox', 'خانة اختيار'),
        ('file', 'رفع ملف'),
    )
    section = models.ForeignKey(FormSection, on_delete=models.CASCADE, related_name='fields')
    label_ar = models.CharField(max_length=200)
    label_en = models.CharField(max_length=200, blank=True, null=True)
    field_type = models.CharField(max_length=50, choices=FIELD_TYPES)
    name = models.CharField(max_length=100) # key code inside json response
    is_required = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_forms_fields'


class FormFieldOption(CombinedSharedModel):
    field = models.ForeignKey(FormField, on_delete=models.CASCADE, related_name='options')
    label_ar = models.CharField(max_length=150)
    label_en = models.CharField(max_length=150, blank=True, null=True)
    value = models.CharField(max_length=100)

    class Meta:
        db_table = 'nebras_forms_field_options'


class FormLayout(CombinedSharedModel):
    form_version = models.OneToOneField(FormVersion, on_delete=models.CASCADE, related_name='layout')
    grid_cols = models.IntegerField(default=12) # bootstrap/tailwind grid system
    theme_json = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_forms_layouts'


class FormRule(CombinedSharedModel):
    form_version = models.ForeignKey(FormVersion, on_delete=models.CASCADE, related_name='rules')
    name = models.CharField(max_length=150)
    trigger_field = models.CharField(max_length=100)
    action_type = models.CharField(max_length=50) # show, hide, enable, disable, require

    class Meta:
        db_table = 'nebras_forms_rules'


class FormCondition(CombinedSharedModel):
    rule = models.ForeignKey(FormRule, on_delete=models.CASCADE, related_name='conditions')
    field_name = models.CharField(max_length=100)
    operator = models.CharField(max_length=20) # equals, not_equals, contains, greater_than
    value = models.CharField(max_length=255)

    class Meta:
        db_table = 'nebras_forms_conditions'


class FormExpression(CombinedSharedModel):
    form_version = models.ForeignKey(FormVersion, on_delete=models.CASCADE)
    target_field = models.CharField(max_length=100)
    expression_string = models.TextField() # mathematical or logical expression

    class Meta:
        db_table = 'nebras_forms_expressions'


class FormValidation(CombinedSharedModel):
    field = models.ForeignKey(FormField, on_delete=models.CASCADE, related_name='validations')
    validation_type = models.CharField(max_length=50) # regex, range, length
    error_message_ar = models.CharField(max_length=255)
    error_message_en = models.CharField(max_length=255, blank=True, null=True)
    rule_value = models.CharField(max_length=255)

    class Meta:
        db_table = 'nebras_forms_validations'


class FormSubmission(CombinedSharedModel):
    form_version = models.ForeignKey(FormVersion, on_delete=models.CASCADE)
    submitted_by = models.UUIDField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    status = models.CharField(max_length=50, default='submitted') # submitted, approved, rejected

    class Meta:
        db_table = 'nebras_forms_submissions'


class FormResponse(CombinedSharedModel):
    submission = models.ForeignKey(FormSubmission, on_delete=models.CASCADE, related_name='responses')
    field_name = models.CharField(max_length=100)
    value = models.TextField()

    class Meta:
        db_table = 'nebras_forms_responses'


class FormAttachment(CombinedSharedModel):
    submission = models.ForeignKey(FormSubmission, on_delete=models.CASCADE, related_name='attachments')
    document_id = models.UUIDField() # reference to Enterprise DMS Document

    class Meta:
        db_table = 'nebras_forms_attachments'


class FormComment(CombinedSharedModel):
    submission = models.ForeignKey(FormSubmission, on_delete=models.CASCADE, related_name='comments')
    user_id = models.UUIDField()
    comment = models.TextField()

    class Meta:
        db_table = 'nebras_forms_comments'


class FormSignature(CombinedSharedModel):
    submission = models.ForeignKey(FormSubmission, on_delete=models.CASCADE, related_name='signatures')
    signed_by = models.UUIDField()
    signature_data = models.TextField() # Base64 or digital signature hash
    signed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_forms_signatures'


class FormApproval(CombinedSharedModel):
    submission = models.ForeignKey(FormSubmission, on_delete=models.CASCADE, related_name='approvals')
    approver_id = models.UUIDField()
    status = models.CharField(max_length=20, default='pending') # pending, approved, rejected
    decision_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_forms_approvals'


class FormAssignment(CombinedSharedModel):
    submission = models.ForeignKey(FormSubmission, on_delete=models.CASCADE, related_name='assignments')
    assigned_to = models.UUIDField()
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_forms_assignments'


class FormTemplate(CombinedSharedModel):
    form_definition = models.ForeignKey(FormDefinition, on_delete=models.CASCADE)
    template_name = models.CharField(max_length=150)
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_forms_templates'


class FormTheme(CombinedSharedModel):
    name = models.CharField(max_length=100)
    primary_color = models.CharField(max_length=7, default='#1e88e5')
    font_family = models.CharField(max_length=100, default='Outfit')
    custom_css = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_forms_themes'


class FormPermission(CombinedSharedModel):
    form_definition = models.ForeignKey(FormDefinition, on_delete=models.CASCADE)
    role_id = models.UUIDField(null=True, blank=True)
    user_id = models.UUIDField(null=True, blank=True)
    can_view = models.BooleanField(default=True)
    can_submit = models.BooleanField(default=True)
    can_approve = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_forms_permissions'


class FormHistory(CombinedSharedModel):
    form_definition = models.ForeignKey(FormDefinition, on_delete=models.CASCADE)
    modified_by = models.UUIDField()
    change_description = models.TextField()

    class Meta:
        db_table = 'nebras_forms_history'


class FormAudit(CombinedSharedModel):
    user_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=150)
    details = models.TextField()

    class Meta:
        db_table = 'nebras_forms_audit'


class FormSettings(CombinedSharedModel):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_forms_settings'


class FormStatistics(CombinedSharedModel):
    form_definition = models.ForeignKey(FormDefinition, on_delete=models.CASCADE)
    total_submissions = models.BigIntegerField(default=0)
    avg_completion_seconds = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_forms_statistics'
