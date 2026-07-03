from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.communications.interfaces.views import (
    ChannelViewSet,
    ProviderViewSet,
    TemplateViewSet,
    TemplateVersionViewSet,
    VariableViewSet,
    MessageViewSet,
    QueueViewSet,
    NotificationViewSet,
    CampaignViewSet,
    PreferenceViewSet,
    EventViewSet,
    WebhookViewSet,
    StatisticsViewSet,
    FailureViewSet,
    RetryViewSet,
    LogViewSet,
)

router = DefaultRouter()
router.register('channels', ChannelViewSet, basename='channel')
router.register('providers', ProviderViewSet, basename='provider')
router.register('templates', TemplateViewSet, basename='template')
router.register('template-versions', TemplateVersionViewSet, basename='template-version')
router.register('variables', VariableViewSet, basename='variable')
router.register('messages', MessageViewSet, basename='message')
router.register('queue', QueueViewSet, basename='queue')
router.register('notifications', NotificationViewSet, basename='notification')
router.register('campaigns', CampaignViewSet, basename='campaign')
router.register('preferences', PreferenceViewSet, basename='preference')
router.register('events', EventViewSet, basename='event')
router.register('webhooks', WebhookViewSet, basename='webhook')
router.register('statistics', StatisticsViewSet, basename='statistic')
router.register('failures', FailureViewSet, basename='failure')
router.register('retries', RetryViewSet, basename='retry')
router.register('logs', LogViewSet, basename='log')

urlpatterns = [
    path('', include(router.urls)),
]
