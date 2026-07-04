from django.db import models
from django.conf import settings
from apps.shared.domain.models import CombinedSharedModel

class SystemCategory(CombinedSharedModel):
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'nebras_cfg_categories'


class SystemSetting(CombinedSharedModel):
    key = models.CharField(max_length=150, unique=True, db_index=True)
    value = models.TextField()
    category = models.ForeignKey(SystemCategory, on_delete=models.SET_NULL, null=True)
    is_encrypted = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_cfg_settings'


class SystemProperty(CombinedSharedModel):
    setting = models.ForeignKey(SystemSetting, on_delete=models.CASCADE, related_name='properties')
    name = models.CharField(max_length=100)
    value = models.CharField(max_length=255)

    class Meta:
        db_table = 'nebras_cfg_properties'


class EnvironmentConfiguration(CombinedSharedModel):
    env_name = models.CharField(max_length=50) # dev, staging, prod
    config_data = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_cfg_env_configs'


class ConfigurationVersion(CombinedSharedModel):
    version_number = models.CharField(max_length=20)
    schema_json = models.JSONField(default=dict)
    change_log = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_cfg_versions'


class ConfigurationHistory(CombinedSharedModel):
    version = models.ForeignKey(ConfigurationVersion, on_delete=models.CASCADE)
    modified_by = models.UUIDField()
    modified_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_cfg_history'


class ConfigurationSnapshot(CombinedSharedModel):
    snapshot_name = models.CharField(max_length=150)
    data = models.JSONField(default=dict)
    created_at_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_cfg_snapshots'


class ConfigurationAudit(CombinedSharedModel):
    user_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=150)
    details = models.TextField()

    class Meta:
        db_table = 'nebras_cfg_audit'


class FeatureGroup(CombinedSharedModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'nebras_cfg_feature_groups'


class FeatureFlag(CombinedSharedModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    is_enabled = models.BooleanField(default=False)
    group = models.ForeignKey(FeatureGroup, on_delete=models.SET_NULL, null=True)
    scheduled_activation = models.DateTimeField(null=True, blank=True)
    scheduled_deactivation = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_cfg_feature_flags'


class FeatureDependency(CombinedSharedModel):
    feature = models.ForeignKey(FeatureFlag, on_delete=models.CASCADE, related_name='dependencies')
    depends_on = models.ForeignKey(FeatureFlag, on_delete=models.CASCADE, related_name='dependents')

    class Meta:
        db_table = 'nebras_cfg_feature_dependencies'


class FeatureTarget(CombinedSharedModel):
    feature = models.ForeignKey(FeatureFlag, on_delete=models.CASCADE)
    target_type = models.CharField(max_length=50) # tenant, role, user
    target_id = models.CharField(max_length=100)

    class Meta:
        db_table = 'nebras_cfg_feature_targets'


class ModuleRegistry(CombinedSharedModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    is_installed = models.BooleanField(default=True)
    health_status = models.CharField(max_length=50, default='healthy')

    class Meta:
        db_table = 'nebras_cfg_modules'


class ModuleDependency(CombinedSharedModel):
    module = models.ForeignKey(ModuleRegistry, on_delete=models.CASCADE, related_name='dependencies')
    depends_on = models.ForeignKey(ModuleRegistry, on_delete=models.CASCADE, related_name='dependents')

    class Meta:
        db_table = 'nebras_cfg_module_dependencies'


class ModuleVersion(CombinedSharedModel):
    module = models.ForeignKey(ModuleRegistry, on_delete=models.CASCADE)
    version_string = models.CharField(max_length=20)
    release_notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_cfg_module_versions'


class PluginRegistry(CombinedSharedModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True)
    manifest = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_cfg_plugins'


class PluginConfiguration(CombinedSharedModel):
    plugin = models.OneToOneField(PluginRegistry, on_delete=models.CASCADE)
    config_data = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_cfg_plugin_config'


class Edition(CombinedSharedModel):
    name = models.CharField(max_length=100) # Community, Professional, Enterprise
    code = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'nebras_cfg_editions'


class License(CombinedSharedModel):
    edition = models.ForeignKey(Edition, on_delete=models.CASCADE)
    license_key = models.CharField(max_length=255, unique=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    max_seats = models.IntegerField(default=10)

    class Meta:
        db_table = 'nebras_cfg_licenses'


class LicenseFeature(CombinedSharedModel):
    license = models.ForeignKey(License, on_delete=models.CASCADE)
    feature_code = models.CharField(max_length=100)

    class Meta:
        db_table = 'nebras_cfg_license_features'


class LicenseUsage(CombinedSharedModel):
    license = models.ForeignKey(License, on_delete=models.CASCADE)
    current_seats_used = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_cfg_license_usage'


class TenantEdition(CombinedSharedModel):
    edition = models.ForeignKey(Edition, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_cfg_tenant_editions'


class MetadataType(CombinedSharedModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'nebras_cfg_metadata_types'


class MetadataDefinition(CombinedSharedModel):
    meta_type = models.ForeignKey(MetadataType, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'nebras_cfg_metadata_definitions'


class MetadataField(CombinedSharedModel):
    definition = models.ForeignKey(MetadataDefinition, on_delete=models.CASCADE, related_name='fields')
    field_name = models.CharField(max_length=100)
    field_type = models.CharField(max_length=50) # string, integer, date

    class Meta:
        db_table = 'nebras_cfg_metadata_fields'


class MetadataSchema(CombinedSharedModel):
    definition = models.OneToOneField(MetadataDefinition, on_delete=models.CASCADE)
    schema_json = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_cfg_metadata_schemas'


class MetadataValidation(CombinedSharedModel):
    field = models.ForeignKey(MetadataField, on_delete=models.CASCADE)
    rule_name = models.CharField(max_length=100)
    expression = models.TextField()

    class Meta:
        db_table = 'nebras_cfg_metadata_validations'


class MetadataTranslation(CombinedSharedModel):
    definition = models.ForeignKey(MetadataDefinition, on_delete=models.CASCADE)
    lang_code = models.CharField(max_length=10)
    translated_title = models.CharField(max_length=200)

    class Meta:
        db_table = 'nebras_cfg_metadata_translations'


class RuntimeParameter(CombinedSharedModel):
    key = models.CharField(max_length=150, unique=True)
    value = models.TextField()

    class Meta:
        db_table = 'nebras_cfg_runtime_parameters'


class GlobalParameter(CombinedSharedModel):
    key = models.CharField(max_length=150, unique=True)
    value = models.TextField()

    class Meta:
        db_table = 'nebras_cfg_global_parameters'


class BranchParameter(CombinedSharedModel):
    branch_id = models.UUIDField()
    key = models.CharField(max_length=150)
    value = models.TextField()

    class Meta:
        db_table = 'nebras_cfg_branch_parameters'


class DepartmentParameter(CombinedSharedModel):
    department_id = models.UUIDField()
    key = models.CharField(max_length=150)
    value = models.TextField()

    class Meta:
        db_table = 'nebras_cfg_dept_parameters'


class AcademicParameter(CombinedSharedModel):
    academic_year_id = models.UUIDField()
    key = models.CharField(max_length=150)
    value = models.TextField()

    class Meta:
        db_table = 'nebras_cfg_academic_parameters'


class UIConfiguration(CombinedSharedModel):
    layout_name = models.CharField(max_length=100)
    config_json = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_cfg_ui_configs'


class MenuConfiguration(CombinedSharedModel):
    role_id = models.UUIDField(null=True, blank=True)
    menu_json = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_cfg_menu_configs'


class MenuItem(CombinedSharedModel):
    menu = models.ForeignKey(MenuConfiguration, on_delete=models.CASCADE, related_name='items')
    label_ar = models.CharField(max_length=100)
    label_en = models.CharField(max_length=100)
    route = models.CharField(max_length=255)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_cfg_menu_items'


class NavigationRule(CombinedSharedModel):
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE)
    required_feature_flag = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'nebras_cfg_navigation_rules'


class ConfigurationTemplate(CombinedSharedModel):
    template_name = models.CharField(max_length=150)
    template_json = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_cfg_templates'


class ConfigurationProfile(CombinedSharedModel):
    profile_name = models.CharField(max_length=100)
    settings_data = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_cfg_profiles'


class ConfigurationPackage(CombinedSharedModel):
    package_name = models.CharField(max_length=150)
    file_path = models.CharField(max_length=500)

    class Meta:
        db_table = 'nebras_cfg_packages'


class ConfigurationImport(CombinedSharedModel):
    imported_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50)

    class Meta:
        db_table = 'nebras_cfg_imports'


class ConfigurationExport(CombinedSharedModel):
    exported_at = models.DateTimeField(auto_now_add=True)
    download_url = models.CharField(max_length=500)

    class Meta:
        db_table = 'nebras_cfg_exports'
