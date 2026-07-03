from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.identity.interfaces.views import (
    LoginView, LogoutView, LogoutAllDevicesView, UserViewSet, 
    RoleViewSet, PermissionMatrixView, SecurityDashboardView, TerminateSessionView
)
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('roles', RoleViewSet, basename='role')

urlpatterns = [
    # المصادقة
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('logout-all/', LogoutAllDevicesView.as_view(), name='auth-logout-all'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    
    # الصلاحيات والأدوار والمستخدمين
    path('', include(router.urls)),
    path('permission-matrix/', PermissionMatrixView.as_view(), name='permission-matrix'),
    
    # الجلسات والأمان
    path('security-dashboard/', SecurityDashboardView.as_view(), name='security-dashboard'),
    path('sessions/<int:pk>/terminate/', TerminateSessionView.as_view(), name='auth-session-terminate'),
]
