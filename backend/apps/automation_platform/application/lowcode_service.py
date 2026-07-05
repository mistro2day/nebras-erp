"""
Low-Code generator service.

Generates *scaffold* artifacts (model / serializer / view / route) from metadata
definitions. Generated code follows Nebras DDD: models extend
``CombinedSharedModel`` (tenant-scoped, soft-delete, audit); views extend
``BaseCRUDViewSet`` (standard response + tenant isolation). Artifacts are stored
as ``GeneratedArtifact`` records and are NOT written to disk automatically — a
human review/apply step is required, so DDD boundaries are never bypassed silently.
"""
from apps.automation_platform.domain.models import (
    EntityDefinition, GeneratedArtifact,
)

_TYPE_MAP = {
    'string': "models.CharField(max_length=255{opts})",
    'text': "models.TextField({opts})",
    'integer': "models.IntegerField({opts})",
    'decimal': "models.DecimalField(max_digits=18, decimal_places=2{opts})",
    'boolean': "models.BooleanField(default=False)",
    'date': "models.DateField({opts})",
    'datetime': "models.DateTimeField({opts})",
    'uuid': "models.UUIDField({opts})",
    'json': "models.JSONField(default=dict, blank=True)",
    'foreignkey': "models.ForeignKey('{related}', on_delete=models.CASCADE{opts})",
    'choice': "models.CharField(max_length=100{opts})",
}


class LowCodeGeneratorService:
    """مولّد الأثر منخفض الشيفرة المتوافق مع بنية Nebras (DDD)."""

    @classmethod
    def generate_entity(cls, entity: EntityDefinition) -> list[GeneratedArtifact]:
        artifacts = [
            cls._artifact(entity, 'model', f"apps/{entity.module_code or entity.code}/domain/models.py",
                          cls._render_model(entity)),
            cls._artifact(entity, 'serializer', f"apps/{entity.module_code or entity.code}/interfaces/serializers.py",
                          cls._render_serializer(entity)),
            cls._artifact(entity, 'view', f"apps/{entity.module_code or entity.code}/interfaces/views.py",
                          cls._render_view(entity)),
            cls._artifact(entity, 'route', f"apps/{entity.module_code or entity.code}/interfaces/urls.py",
                          cls._render_urls(entity)),
        ]
        entity.status = 'generated'
        entity.save(update_fields=['status'])
        return artifacts

    @classmethod
    def _artifact(cls, entity, artifact_type, path, content):
        return GeneratedArtifact.objects.create(
            tenant_id=entity.tenant_id, source_type='entity', source_id=entity.id,
            artifact_type=artifact_type, file_path=path, content=content, is_applied=False,
        )

    @classmethod
    def _class_name(cls, code: str) -> str:
        return ''.join(part.capitalize() for part in code.replace('-', '_').split('_'))

    @classmethod
    def _render_model(cls, entity) -> str:
        cn = cls._class_name(entity.code)
        lines = [
            "from django.db import models",
            "from apps.shared.domain.models import CombinedSharedModel",
            "",
            "",
            f"class {cn}(CombinedSharedModel):",
            f'    """{entity.description or entity.name}"""',
        ]
        fields = list(entity.fields.all())
        if not fields:
            lines.append("    name = models.CharField(max_length=255)")
        for f in fields:
            opts = []
            if not f.required:
                opts.append("null=True, blank=True")
            if f.unique:
                opts.append("unique=True")
            opt_str = (", " + ", ".join(opts)) if opts else ""
            tmpl = _TYPE_MAP.get(f.field_type, _TYPE_MAP['string'])
            rendered = tmpl.format(opts=opt_str, related=f.related_entity_code or 'self')
            lines.append(f"    {f.name} = {rendered}")
        lines += [
            "",
            "    class Meta:",
            f"        db_table = 'nebras_lc_{entity.code}'",
            "",
        ]
        return "\n".join(lines)

    @classmethod
    def _render_serializer(cls, entity) -> str:
        cn = cls._class_name(entity.code)
        return (
            "from rest_framework import serializers\n"
            f"from apps.{entity.module_code or entity.code}.domain.models import {cn}\n\n\n"
            f"class {cn}Serializer(serializers.ModelSerializer):\n"
            "    class Meta:\n"
            f"        model = {cn}\n"
            "        fields = '__all__'\n"
        )

    @classmethod
    def _render_view(cls, entity) -> str:
        cn = cls._class_name(entity.code)
        return (
            "from apps.shared.interfaces.views import BaseCRUDViewSet\n"
            f"from apps.{entity.module_code or entity.code}.domain.models import {cn}\n"
            f"from apps.{entity.module_code or entity.code}.interfaces.serializers import {cn}Serializer\n\n\n"
            f"class {cn}ViewSet(BaseCRUDViewSet):\n"
            f"    model_class = {cn}\n"
            f"    serializer_class = {cn}Serializer\n"
        )

    @classmethod
    def _render_urls(cls, entity) -> str:
        cn = cls._class_name(entity.code)
        return (
            "from django.urls import path, include\n"
            "from rest_framework.routers import DefaultRouter\n"
            f"from apps.{entity.module_code or entity.code}.interfaces.views import {cn}ViewSet\n\n"
            "router = DefaultRouter()\n"
            f"router.register('{entity.code}', {cn}ViewSet, basename='{entity.code}')\n\n"
            "urlpatterns = [path('', include(router.urls))]\n"
        )
