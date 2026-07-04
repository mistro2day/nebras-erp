from django.db import models
from django.conf import settings
from apps.shared.domain.models import CombinedSharedModel

class Workspace(CombinedSharedModel):
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    is_template = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_p13n_workspaces'


class WorkspaceLayout(CombinedSharedModel):
    workspace = models.OneToOneField(Workspace, on_delete=models.CASCADE, related_name='layout')
    layout_data = models.JSONField(default=dict) # Grid parameters

    class Meta:
        db_table = 'nebras_p13n_workspace_layouts'


class WidgetDefinition(CombinedSharedModel):
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    widget_type = models.CharField(max_length=50) # chart, list, timeline

    class Meta:
        db_table = 'nebras_p13n_widget_definitions'


class WorkspaceWidget(CombinedSharedModel):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='widgets')
    widget_def = models.ForeignKey(WidgetDefinition, on_delete=models.CASCADE)
    position_x = models.IntegerField(default=0)
    position_y = models.IntegerField(default=0)
    width = models.IntegerField(default=4)
    height = models.IntegerField(default=3)

    class Meta:
        db_table = 'nebras_p13n_workspace_widgets'


class WidgetConfiguration(CombinedSharedModel):
    workspace_widget = models.OneToOneField(WorkspaceWidget, on_delete=models.CASCADE, related_name='config')
    config_data = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_p13n_widget_config'


class DashboardLayout(CombinedSharedModel):
    name = models.CharField(max_length=100)
    user_id = models.UUIDField()
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_p13n_dashboard_layouts'


class DashboardPage(CombinedSharedModel):
    layout = models.ForeignKey(DashboardLayout, on_delete=models.CASCADE, related_name='pages')
    title = models.CharField(max_length=100)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_p13n_dashboard_pages'


class DashboardSection(CombinedSharedModel):
    page = models.ForeignKey(DashboardPage, on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(max_length=100)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_p13n_dashboard_sections'


class UserPreference(CombinedSharedModel):
    user_id = models.UUIDField(unique=True, db_index=True)
    default_branch_id = models.UUIDField(null=True, blank=True)
    default_academic_year_id = models.UUIDField(null=True, blank=True)
    default_term_id = models.UUIDField(null=True, blank=True)
    landing_dashboard = models.CharField(max_length=150, default='/dashboard')

    class Meta:
        db_table = 'nebras_p13n_user_preferences'


class UserProfilePreference(CombinedSharedModel):
    user_id = models.UUIDField(unique=True)
    profile_layout_preference = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_p13n_profile_preferences'


class Favorite(CombinedSharedModel):
    user_id = models.UUIDField(db_index=True)
    item_type = models.CharField(max_length=50) # screen, report, student, employee
    item_id = models.CharField(max_length=100)
    title = models.CharField(max_length=150)

    class Meta:
        db_table = 'nebras_p13n_favorites'


class PinnedItem(CombinedSharedModel):
    user_id = models.UUIDField()
    item_type = models.CharField(max_length=50)
    item_id = models.CharField(max_length=100)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_p13n_pinned_items'


class Bookmark(CombinedSharedModel):
    user_id = models.UUIDField()
    url = models.CharField(max_length=500)
    title = models.CharField(max_length=150)

    class Meta:
        db_table = 'nebras_p13n_bookmarks'


class QuickAccess(CombinedSharedModel):
    user_id = models.UUIDField()
    title = models.CharField(max_length=100)
    route = models.CharField(max_length=255)

    class Meta:
        db_table = 'nebras_p13n_quick_access'


class RecentItem(CombinedSharedModel):
    user_id = models.UUIDField()
    item_type = models.CharField(max_length=50)
    item_id = models.CharField(max_length=100)
    title = models.CharField(max_length=150)
    route = models.CharField(max_length=255)
    last_accessed = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'nebras_p13n_recent_items'


class SavedFilter(CombinedSharedModel):
    user_id = models.UUIDField()
    screen_code = models.CharField(max_length=100)
    filter_name = models.CharField(max_length=100)
    filter_json = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_p13n_saved_filters'


class SavedView(CombinedSharedModel):
    user_id = models.UUIDField()
    screen_code = models.CharField(max_length=100)
    view_name = models.CharField(max_length=100)
    view_config = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_p13n_saved_views'


class ColumnPreference(CombinedSharedModel):
    user_id = models.UUIDField()
    table_code = models.CharField(max_length=100)
    visible_columns = models.JSONField(default=list)

    class Meta:
        db_table = 'nebras_p13n_column_preferences'


class TablePreference(CombinedSharedModel):
    user_id = models.UUIDField()
    table_code = models.CharField(max_length=100)
    page_size = models.IntegerField(default=10)
    sort_column = models.CharField(max_length=100, blank=True, null=True)
    sort_direction = models.CharField(max_length=10, default='asc')

    class Meta:
        db_table = 'nebras_p13n_table_preferences'


class NavigationPreference(CombinedSharedModel):
    user_id = models.UUIDField()
    sidebar_collapsed = models.BooleanField(default=False)
    pinned_modules = models.JSONField(default=list)

    class Meta:
        db_table = 'nebras_p13n_nav_preferences'


class MenuPreference(CombinedSharedModel):
    user_id = models.UUIDField()
    menu_layout_preference = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_p13n_menu_preferences'


class ShortcutPreference(CombinedSharedModel):
    user_id = models.UUIDField()
    custom_shortcuts = models.JSONField(default=dict) # action -> keys mappings

    class Meta:
        db_table = 'nebras_p13n_shortcut_preferences'


class Theme(CombinedSharedModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    branding_config = models.JSONField(default=dict) # Primary/Secondary/Logo

    class Meta:
        db_table = 'nebras_p13n_themes'


class ThemeProfile(CombinedSharedModel):
    user_id = models.UUIDField(unique=True)
    active_theme = models.ForeignKey(Theme, on_delete=models.SET_NULL, null=True)
    density = models.CharField(max_length=20, default='default') # default, compact, loose

    class Meta:
        db_table = 'nebras_p13n_theme_profiles'


class LanguagePreference(CombinedSharedModel):
    user_id = models.UUIDField(unique=True)
    language_code = models.CharField(max_length=10, default='ar')

    class Meta:
        db_table = 'nebras_p13n_lang_preferences'


class TimezonePreference(CombinedSharedModel):
    user_id = models.UUIDField(unique=True)
    timezone_name = models.CharField(max_length=100, default='UTC')

    class Meta:
        db_table = 'nebras_p13n_tz_preferences'


class AccessibilityProfile(CombinedSharedModel):
    user_id = models.UUIDField(unique=True)
    font_scale = models.FloatField(default=1.0)
    high_contrast = models.BooleanField(default=False)
    reduced_motion = models.BooleanField(default=False)
    focus_indicators = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_p13n_accessibility_profiles'


class NotificationPreference(CombinedSharedModel):
    user_id = models.UUIDField()
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_p13n_notification_preferences'


class UserExperienceAudit(CombinedSharedModel):
    user_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=150)
    details = models.TextField()

    class Meta:
        db_table = 'nebras_p13n_ux_audit'


class PersonalizationSettings(CombinedSharedModel):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_p13n_settings'
