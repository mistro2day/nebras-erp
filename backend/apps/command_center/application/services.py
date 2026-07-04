import uuid
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.command_center.domain.models import (
    Command, CommandCategory, CommandPermission, RecentCommand, FavoriteCommand
)

class CommandExecutionService:
    @staticmethod
    def search_commands(tenant_id, query_str, user_id, user_role_ids):
        """
        البحث عن الأوامر والوظائف المتاحة للمستخدم الحالي مع فلترة الصلاحيات.
        """
        # جلب جميع الأوامر النشطة
        commands = Command.objects.filter(tenant_id=tenant_id, is_active=True).select_related('category')
        
        # فلترة الأوامر بناء على صلاحيات الدور والمستخدم
        allowed_commands = []
        for cmd in commands:
            permissions = CommandPermission.objects.filter(tenant_id=tenant_id, command=cmd)
            if not permissions.exists():
                # أمر عام بدون قيود صلاحيات
                allowed_commands.append(cmd)
                continue

            # التحقق من وجود إذن للمستخدم أو الأدوار التابع لها
            has_perm = permissions.filter(
                models.Q(user_id=user_id) | models.Q(role_id__in=user_role_ids)
            ).exists()
            if has_perm:
                allowed_commands.append(cmd)

        # مطابقة محرك البحث مع عنوان الأمر بالعربي أو الإنجليزي
        results = []
        for cmd in allowed_commands:
            if not query_str or query_str.lower() in cmd.title_ar.lower() or query_str.lower() in cmd.title_en.lower():
                results.append({
                    "id": cmd.id,
                    "title_ar": cmd.title_ar,
                    "title_en": cmd.title_en,
                    "category": cmd.category.name_ar,
                    "action_type": cmd.action_type,
                    "target_route": cmd.target_route
                })

        return results

    @staticmethod
    def execute_command(tenant_id, command_id, user_id):
        """
        تسجيل نشاط تشغيل الأمر في قائمة الأوامر الأخيرة المستهدفة.
        """
        try:
            cmd = Command.objects.get(tenant_id=tenant_id, id=command_id)
        except Command.DoesNotExist:
            raise ValidationError("الأمر المحدد غير موجود.")

        recent, created = RecentCommand.objects.get_or_create(
            tenant_id=tenant_id,
            user_id=user_id,
            command=cmd
        )
        recent.last_executed = timezone.now()
        recent.save()

        # توليد إحداثيات تشغيل الحدث
        return {
            "status": "success",
            "action_type": cmd.action_type,
            "target_route": cmd.target_route
        }
from django.db import models
