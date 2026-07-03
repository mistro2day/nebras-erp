from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class AIConversation(CombinedBaseModel):
    user_id = models.UUIDField(db_index=True)
    prompt = models.TextField()
    response = models.TextField()
    tokens_used = models.IntegerField(default=0)

    class Meta:
        db_table = 'ai_conversations'