"""
Plugin Platform domain models (registry, versioning, dependencies, installation).

Tenant-safe: every installation is scoped to a tenant. Security validation status
is tracked so untrusted plugins cannot be activated. Hot-reload is a placeholder
flag only (no runtime code loading is implemented here).
"""
from django.db import models
from apps.shared.domain.models import CombinedSharedModel


class Plugin(CombinedSharedModel):
    """سجل إضافة في السوق/المستودع (Plugin Registry)."""
    STATUS = (('registered', 'مُسجّل'), ('published', 'منشور'),
              ('deprecated', 'مُهمَل'), ('blocked', 'محظور'))
    name = models.CharField(max_length=200)
    slug = models.CharField(max_length=120, unique=True, db_index=True)
    vendor = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS, default='registered')
    is_marketplace_ready = models.BooleanField(default=False)
    homepage_url = models.URLField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'nebras_ap_plugins'


class PluginVersion(CombinedSharedModel):
    """إصدار من الإضافة (Plugin Versioning)."""
    SECURITY = (('pending', 'قيد المراجعة'), ('passed', 'اجتاز'), ('failed', 'فشل'))
    plugin = models.ForeignKey(Plugin, on_delete=models.CASCADE, related_name='versions')
    version = models.CharField(max_length=40)
    manifest = models.JSONField(default=dict, blank=True)   # permissions, entrypoints, hooks
    changelog = models.TextField(blank=True, null=True)
    security_status = models.CharField(max_length=20, choices=SECURITY, default='pending')
    is_latest = models.BooleanField(default=True)
    package_checksum = models.CharField(max_length=128, blank=True, null=True)

    class Meta:
        db_table = 'nebras_ap_plugin_versions'
        unique_together = ('plugin', 'version')


class PluginDependency(CombinedSharedModel):
    """اعتمادية إصدار إضافة على إضافة أخرى (Plugin Dependencies)."""
    version = models.ForeignKey(PluginVersion, on_delete=models.CASCADE, related_name='dependencies')
    depends_on_slug = models.CharField(max_length=120, db_index=True)
    version_constraint = models.CharField(max_length=60, default='*')  # semver constraint

    class Meta:
        db_table = 'nebras_ap_plugin_dependencies'


class PluginInstallation(CombinedSharedModel):
    """تثبيت إضافة لمستأجر محدد (Tenant Safe Installation)."""
    STATE = (('installed', 'مثبّت'), ('enabled', 'مفعّل'),
             ('disabled', 'معطّل'), ('uninstalled', 'مُزال'), ('error', 'خطأ'))
    plugin = models.ForeignKey(Plugin, on_delete=models.CASCADE, related_name='installations')
    version = models.ForeignKey(PluginVersion, on_delete=models.PROTECT, related_name='installations')
    state = models.CharField(max_length=20, choices=STATE, default='installed')
    settings = models.JSONField(default=dict, blank=True)
    hot_reload_enabled = models.BooleanField(default=False)  # placeholder only
    installed_by = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_ap_plugin_installations'
        unique_together = ('tenant_id', 'plugin')
