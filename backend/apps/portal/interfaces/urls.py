from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.portal.interfaces.views import (
    ParentDashboardView, StudentDashboardView, ApplicantDashboardView, PortalProfileView,
    PortalNotificationViewSet, PortalAnnouncementViewSet, PortalMessageViewSet, PortalTaskViewSet,
    PortalSettingsViewSet, PortalAnalyticsView,
    ParentChildrenView, ParentChildDetailView, ParentContactView
)

router = DefaultRouter()
router.register(r'notifications', PortalNotificationViewSet, basename='portal-notifications')
router.register(r'announcements', PortalAnnouncementViewSet, basename='portal-announcements')
router.register(r'messages', PortalMessageViewSet, basename='portal-messages')
router.register(r'tasks', PortalTaskViewSet, basename='portal-tasks')
router.register(r'settings', PortalSettingsViewSet, basename='portal-settings')

urlpatterns = [
    path('', include(router.urls)),
    path('parent/dashboard/', ParentDashboardView.as_view(), name='parent-dashboard'),
    path('parent/children/', ParentChildrenView.as_view(), name='parent-children'),
    path('parent/children/<uuid:student_id>/', ParentChildDetailView.as_view(), name='parent-child-detail'),
    path('parent/contact/', ParentContactView.as_view(), name='parent-contact'),
    path('student/dashboard/', StudentDashboardView.as_view(), name='student-dashboard'),
    path('applicant/dashboard/', ApplicantDashboardView.as_view(), name='applicant-dashboard'),
    path('profile/', PortalProfileView.as_view(), name='portal-profile'),
    path('analytics/', PortalAnalyticsView.as_view(), name='portal-analytics'),
]
