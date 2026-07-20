from rest_framework.routers import DefaultRouter
from apps.ai.interfaces.views import AIConversationViewSet

router = DefaultRouter()
router.register(r'conversations', AIConversationViewSet, basename='ai-conversations')

urlpatterns = router.urls
