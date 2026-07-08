from rest_framework import viewsets, status, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db.models import Q
from django.core.cache import cache

from apps.identity.domain.models import User, PasswordHistory
from apps.identity.domain.rbac import Role, Permission, UserRole, RolePermission
from apps.identity.domain.sessions import UserSession
from apps.identity.domain.user_assignment import UserAssignment

from apps.identity.interfaces.serializers import (
    UserSerializer, CreateUserSerializer, RoleSerializer, 
    PermissionSerializer, UserRoleAssignmentSerializer, 
    ChangePasswordSerializer, ResetPasswordEmailSerializer, 
    ResetPasswordConfirmSerializer, UserAssignmentSerializer
)
from apps.identity.application.services import (
    PasswordPolicyService, IdentitySecurityService, PermissionCacheService
)
from apps.common.responses import StandardResponse, StandardPagination
import uuid

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        device_id = request.data.get('device_id', 'unknown_device')
        device_name = request.data.get('device_name', 'Web Browser')
        browser = request.data.get('browser', 'Web')
        operating_system = request.data.get('operating_system', 'OS')

        try:
            user = User.objects.get(email=email, deleted_at__isnull=True)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': {
                    'code': 'authentication_failed',
                    'message': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
                }
            }, status=status.HTTP_401_UNAUTHORIZED)

        # التحقق من قفل الحساب
        if IdentitySecurityService.check_lockout(user):
            return Response({
                'success': False,
                'error': {
                    'code': 'account_locked',
                    'message': f"هذا الحساب مغلق مؤقتاً بسبب محاولات تسجيل دخول فاشلة متكررة. يرجى المحاولة بعد قليل."
                }
            }, status=status.HTTP_403_FORBIDDEN)

        authenticated_user = authenticate(email=email, password=password)
        if not authenticated_user:
            IdentitySecurityService.handle_failed_login(user)
            return Response({
                'success': False,
                'error': {
                    'code': 'authentication_failed',
                    'message': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
                }
            }, status=status.HTTP_401_UNAUTHORIZED)

        IdentitySecurityService.handle_successful_login(user)

        # التحقق من انتهاء صلاحية كلمة المرور
        if user.password_expires_at and timezone.now() > user.password_expires_at:
            # تتطلب تغيير كلمة المرور قبل المتابعة
            pass # هنا يمكن إرجاع كود مخصص لتغيير كلمة المرور

        # توليد الرموز الأمنية للـ JWT
        refresh = RefreshToken.for_user(user)
        
        # تسجيل الجلسة والجهاز الفعال
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        
        # خطوات ثانوية: فشلها لا يجب أن يُفشل الدخول بعد نجاح المصادقة (لا 500)
        import logging
        _log = logging.getLogger(__name__)
        try:
            UserSession.objects.create(
                user=user,
                tenant_id=tenant_id,
                device_id=device_id,
                device_name=device_name,
                browser=browser,
                operating_system=operating_system,
                ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                is_active=True
            )
        except Exception:
            _log.exception('login: UserSession create failed')

        # جلب الصلاحيات الفعالة
        try:
            user_perms = PermissionCacheService.get_user_permissions(user, tenant_id)
        except Exception:
            _log.exception('login: permissions fetch failed')
            user_perms = []

        return StandardResponse({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                **UserSerializer(user).data,
                'is_superuser': user.is_superuser
            },
            'permissions': list(user_perms)
        }, message="تم تسجيل الدخول بنجاح.")


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass

        # إنهاء جلسات العمل الفعالة للجهاز الحالي
        UserSession.objects.filter(user=request.user, is_active=True).update(is_active=False)
        return StandardResponse(None, message="تم تسجيل الخروج بنجاح.")


class LogoutAllDevicesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # إنهاء جميع الجلسات النشطة للمستخدم
        UserSession.objects.filter(user=request.user, is_active=True).update(is_active=False)
        return StandardResponse(None, message="تم تسجيل الخروج من جميع الأجهزة بنجاح.")


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['email', 'first_name', 'last_name', 'username', 'phone']
    ordering_fields = ['created_at', 'email', 'last_name']

    def get_queryset(self):
        # تصفية الحذف اللطيف تلقائياً
        return User.objects.filter(deleted_at__isnull=True)

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateUserSerializer
        return UserSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return StandardResponse(None, message="تم حذف المستخدم لطيفاً بنجاح.")

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        # استرجاع مستخدم محذوف لطيفاً
        try:
            user = User.objects.get(pk=pk, deleted_at__isnull=False)
            user.restore()
            return StandardResponse(UserSerializer(user).data, message="تم استرجاع الحساب بنجاح.")
        except User.DoesNotExist:
            return Response({'error': 'المستخدم غير موجود أو غير محذوف.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='assign-roles')
    def assign_roles(self, request, pk=None):
        user = self.get_object()
        serializer = UserRoleAssignmentSerializer(data=request.data, many=True)
        serializer.is_validate_only = False
        if serializer.is_valid():
            tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
            if not tenant_id:
                return Response({'error': 'معرف المستأجر غير متوفر.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # إزالة الأدوار القديمة لنفس المستأجر
            UserRole.objects.filter(user=user, tenant_id=tenant_id).delete()
            
            # تعيين الأدوار الجديدة
            for item in serializer.validated_data:
                role = Role.objects.get(id=item['role_id'])
                UserRole.objects.create(
                    user=user,
                    role=role,
                    tenant_id=tenant_id,
                    expires_at=item.get('expires_at')
                )
            # مسح كاش الصلاحيات
            PermissionCacheService.clear_user_permissions_cache(user.id, tenant_id)
            return StandardResponse(None, message="تم تحديث أدوار المستخدم بنجاح.")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='change-password')
    def change_password(self, request, pk=None):
        user = self.get_object()
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            if not check_password(serializer.validated_data['old_password'], user.password):
                return Response({'error': 'كلمة المرور الحالية غير صحيحة.'}, status=status.HTTP_400_BAD_REQUEST)
            
            new_password = serializer.validated_data['new_password']
            try:
                PasswordPolicyService.validate_password_strength(new_password)
                PasswordPolicyService.check_password_history(user, new_password)
            except ValidationError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(new_password)
            user.save()
            PasswordPolicyService.record_password_change(user, user.password)
            return StandardResponse(None, message="تم تغيير كلمة المرور بنجاح.")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RoleSerializer

    def get_queryset(self):
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        return Role.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)

    def perform_create(self, serializer):
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        serializer.save(tenant_id=tenant_id)

    @action(detail=True, methods=['post'], url_path='clone')
    def clone(self, request, pk=None):
        role = self.get_object()
        new_name = request.data.get('name', f"{role.name} (نسخة)")
        new_code = request.data.get('code', f"{role.code}_clone")
        
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        
        # إنشاء الدور الجديد
        cloned_role = Role.objects.create(
            tenant_id=tenant_id,
            name=new_name,
            code=new_code,
            category='custom',
            description=role.description,
            parent=role.parent
        )
        
        # نسخ الصلاحيات
        permissions = RolePermission.objects.filter(role=role)
        for p in permissions:
            RolePermission.objects.create(role=cloned_role, permission=p.permission)
            
        return StandardResponse(RoleSerializer(cloned_role).data, message="تم استنساخ الدور بنجاح.")


class PermissionMatrixView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        roles = Role.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)
        perms = Permission.objects.all()
        
        matrix = []
        for p in perms:
            assigned_roles = RolePermission.objects.filter(permission=p, role__in=roles).values_list('role_id', flat=True)
            matrix.append({
                'permission': PermissionSerializer(p).data,
                'role_ids': [str(r_id) for r_id in assigned_roles]
            })
            
        return StandardResponse({
            'roles': RoleSerializer(roles, many=True).data,
            'matrix': matrix
        })

    def post(self, request):
        # تحديث مصفوفة الصلاحيات بالكامل
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        role_id = request.data.get('role_id')
        permission_ids = request.data.get('permission_ids', [])
        
        try:
            role = Role.objects.get(id=role_id, tenant_id=tenant_id)
        except Role.DoesNotExist:
            return Response({'error': 'الدور المحدد غير موجود.'}, status=status.HTTP_404_NOT_FOUND)
            
        # إزالة جميع الصلاحيات القديمة وتعيين الجديدة
        RolePermission.objects.filter(role=role).delete()
        for p_id in permission_ids:
            try:
                perm = Permission.objects.get(id=p_id)
                RolePermission.objects.create(role=role, permission=perm)
            except Permission.DoesNotExist:
                pass
                
        # مسح كاش الصلاحيات لجميع المستخدمين الذين يملكون هذا الدور
        user_ids = UserRole.objects.filter(role=role, tenant_id=tenant_id).values_list('user_id', flat=True)
        for u_id in user_ids:
            PermissionCacheService.clear_user_permissions_cache(u_id, tenant_id)
            
        return StandardResponse(None, message="تم تحديث مصفوفة الصلاحيات بنجاح.")


class SecurityDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        
        # إحصائيات سريعة
        active_sessions = UserSession.objects.filter(tenant_id=tenant_id, is_active=True).count()
        total_users = User.objects.filter(deleted_at__isnull=True).count()
        locked_users = User.objects.filter(status='locked').count()
        
        # الجلسات النشطة حالياً للمستخدم الحالي
        my_sessions = UserSession.objects.filter(user=request.user, is_active=True)
        
        data = {
            'stats': {
                'active_sessions': active_sessions,
                'total_users': total_users,
                'locked_users': locked_users
            },
            'my_sessions': [{
                'id': session.id,
                'device_name': session.device_name,
                'browser': session.browser,
                'operating_system': session.operating_system,
                'ip_address': session.ip_address,
                'last_activity': session.last_activity,
                'created_at': session.created_at,
                'is_current': session.user_agent == request.META.get('HTTP_USER_AGENT', '')
            } for session in my_sessions]
        }
        return StandardResponse(data)


class TerminateSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        UserSession.objects.filter(id=pk, user=request.user).update(is_active=False)
        return StandardResponse(None, message="تم إنهاء الجلسة المحددة بنجاح.")
