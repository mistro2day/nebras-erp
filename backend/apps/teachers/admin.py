from django.contrib import admin
from apps.teachers.domain.models import TeacherProfile, TeacherAssignment


@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'specialization', 'qualification', 'experience_years', 'tenant_id')
    list_filter = ('specialization',)
    search_fields = ('specialization', 'qualification')


@admin.register(TeacherAssignment)
class TeacherAssignmentAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'subject_id', 'section_id', 'tenant_id')
