from django.db import models
from django.conf import settings
from apps.shared.domain.models import CombinedSharedModel

class CommandCategory(CombinedSharedModel):
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'nebras_cmd_categories'


class Command(CombinedSharedModel):
    title_ar = models.CharField(max_length=150)
    title_en = models.CharField(max_length=150)
    category = models.ForeignKey(CommandCategory, on_delete=models.CASCADE, related_name='commands')
    action_type = models.CharField(max_length=50) # navigate, action, search, api
    target_route = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_commands'


class CommandAction(CombinedSharedModel):
    command = models.OneToOneField(Command, on_delete=models.CASCADE)
    api_endpoint = models.CharField(max_length=255)
    payload_template = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_cmd_actions'


class CommandShortcut(CombinedSharedModel):
    command = models.ForeignKey(Command, on_delete=models.CASCADE)
    key_combination = models.CharField(max_length=50) # e.g. Ctrl+Shift+S

    class Meta:
        db_table = 'nebras_cmd_shortcuts'


class CommandPermission(CombinedSharedModel):
    command = models.ForeignKey(Command, on_delete=models.CASCADE)
    role_id = models.UUIDField(null=True, blank=True)
    user_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_cmd_permissions'


class RecentCommand(CombinedSharedModel):
    user_id = models.UUIDField()
    command = models.ForeignKey(Command, on_delete=models.CASCADE)
    last_executed = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'nebras_cmd_recent'


class FavoriteCommand(CombinedSharedModel):
    user_id = models.UUIDField()
    command = models.ForeignKey(Command, on_delete=models.CASCADE)

    class Meta:
        db_table = 'nebras_cmd_favorites'


class PinnedCommand(CombinedSharedModel):
    user_id = models.UUIDField()
    command = models.ForeignKey(Command, on_delete=models.CASCADE)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_cmd_pinned'


class CommandHistory(CombinedSharedModel):
    user_id = models.UUIDField()
    command = models.ForeignKey(Command, on_delete=models.CASCADE)
    executed_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20)

    class Meta:
        db_table = 'nebras_cmd_history'


class CommandAnalytics(CombinedSharedModel):
    command = models.ForeignKey(Command, on_delete=models.CASCADE)
    execution_count = models.BigIntegerField(default=0)
    avg_execution_ms = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_cmd_analytics'


class CommandAlias(CombinedSharedModel):
    command = models.ForeignKey(Command, on_delete=models.CASCADE)
    alias_ar = models.CharField(max_length=150)
    alias_en = models.CharField(max_length=150)

    class Meta:
        db_table = 'nebras_cmd_aliases'


class NavigationItem(CombinedSharedModel):
    title_ar = models.CharField(max_length=100)
    title_en = models.CharField(max_length=100)
    route = models.CharField(max_length=255)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        db_table = 'nebras_cmd_navigation'


class QuickAction(CombinedSharedModel):
    name = models.CharField(max_length=100)
    command = models.ForeignKey(Command, on_delete=models.CASCADE)
    icon = models.CharField(max_length=50)

    class Meta:
        db_table = 'nebras_cmd_quick_actions'


class Workspace(CombinedSharedModel):
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    role_id = models.UUIDField(null=True, blank=True) # associated role

    class Meta:
        db_table = 'nebras_cmd_workspaces'


class WorkspaceLayout(CombinedSharedModel):
    workspace = models.OneToOneField(Workspace, on_delete=models.CASCADE)
    layout_json = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_cmd_workspace_layouts'


class WorkspaceFavorite(CombinedSharedModel):
    user_id = models.UUIDField()
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)

    class Meta:
        db_table = 'nebras_cmd_workspace_favorites'


class WorkspaceHistory(CombinedSharedModel):
    user_id = models.UUIDField()
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    accessed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'nebras_cmd_workspace_history'


class WorkspaceSettings(CombinedSharedModel):
    user_id = models.UUIDField()
    active_workspace = models.ForeignKey(Workspace, on_delete=models.SET_NULL, null=True)
    theme_preference = models.CharField(max_length=20, default='light')

    class Meta:
        db_table = 'nebras_cmd_workspace_settings'


class CommandAudit(CombinedSharedModel):
    user_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=150)
    details = models.TextField()

    class Meta:
        db_table = 'nebras_cmd_audit'
