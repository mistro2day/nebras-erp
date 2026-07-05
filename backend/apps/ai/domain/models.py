from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class AIConversation(CombinedBaseModel):
    user_id = models.UUIDField(db_index=True, verbose_name="المستخدم")
    prompt = models.TextField(verbose_name="السؤال")
    response = models.TextField(verbose_name="الرد")
    tokens_used = models.IntegerField(default=0, verbose_name="عدد الرموز المستهلكة")

    class Meta:
        db_table = 'ai_conversations'
        verbose_name = "محادثة ذكاء اصطناعي"
        verbose_name_plural = "محادثات الذكاء الاصطناعي"