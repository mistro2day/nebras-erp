from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from apps.identity.models import User, PasswordHistory, Role, Permission, UserRole, UserSession, UserAssignment

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'status', 'is_staff', 'is_superuser')
    list_filter = ('status', 'is_staff', 'is_superuser', 'is_active')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone', 'national_id', 'language', 'user_timezone')}),
        ('Permissions', {'fields': ('status', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important Dates', {'fields': ('last_login', 'lockout_until', 'password_changed_at', 'password_expires_at')}),
    )
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)

admin.site.register(PasswordHistory)
admin.site.register(Role)
admin.site.register(Permission)
admin.site.register(UserRole)
admin.site.register(UserSession)
admin.site.register(UserAssignment)
