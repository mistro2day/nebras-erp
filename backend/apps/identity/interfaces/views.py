from rest_framework import viewsets, status, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password
from django.utils import timezone
from django.db.models import Q, Count
from django.core.cache import cache
from django.core.exceptions import ValidationError

from apps.identity.domain.models import User, PasswordHistory
from apps.identity.domain.rbac import Role, Permission, UserRole, RolePermission, ensure_system_roles
from apps.identity.domain.sessions import UserSession
from apps.identity.domain.user_assignment import UserAssignment

from apps.identity.interfaces.serializers import (
    UserSerializer, CreateUserSerializer, RoleSerializer, 
    PermissionSerializer, UserRoleAssignmentSerializer, 
    ChangePasswordSerializer, AdminSetPasswordSerializer,
    ResetPasswordEmailSerializer, ResetPasswordConfirmSerializer,
    UserAssignmentSerializer
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

        # توليد الرموز الأمنية للـ JWT
        refresh = RefreshToken.for_user(user)
        
        # تسجيل الجلسة والجهاز الفعال
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        
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

        portal_user_type = None
        try:
            from apps.portal.domain.models import PortalUser
            pu = PortalUser.objects.filter(user=user).first()
            if pu:
                portal_user_type = pu.user_type
        except Exception:
            _log.exception('login: portal user type fetch failed')

        return StandardResponse({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                **UserSerializer(user, context={'request': request}).data,
                'is_superuser': user.is_superuser,
                'portal_user_type': portal_user_type,
            },
            'permissions': list(user_perms)
        }, message="تم تسجيل الدخول بنجاح.")


class ChangeMyPasswordView(APIView):
    """تغيير المستخدم الحالي لكلمة مروره (خدمة ذاتية)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not old_password or not new_password:
            return Response({'error': 'كلمة المرور الحالية والجديدة مطلوبتان.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not check_password(old_password, user.password):
            return Response({'error': 'كلمة المرور الحالية غير صحيحة.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return Response({'error': 'يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل.'}, status=status.HTTP_400_BAD_REQUEST)
        if old_password == new_password:
            return Response({'error': 'يجب أن تختلف كلمة المرور الجديدة عن الحالية.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            PasswordPolicyService.validate_password_strength(new_password)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return StandardResponse(None, message="تم تغيير كلمة المرور بنجاح.")


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass

        UserSession.objects.filter(user=request.user, is_active=True).update(is_active=False)
        return StandardResponse(None, message="تم تسجيل الخروج بنجاح.")


class LogoutAllDevicesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        UserSession.objects.filter(user=request.user, is_active=True).update(is_active=False)
        return StandardResponse(None, message="تم تسجيل الخروج من جميع الأجهزة بنجاح.")


class UserViewSet(viewsets.ModelViewSet):
    """
    مركز إدارة المستخدمين الموحد للمستأجر:
    - فرز وتصنيف حسب الفئة (أولياء أمور، معلمين، إدارة، طلاب، موظفين)
    - إدارة الحالات والأمان وقفل الحساب
    - إدارة وتعيين الأدوار والصلاحيات
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['email', 'first_name', 'last_name', 'username', 'phone', 'national_id']
    ordering_fields = ['created_at', 'email', 'first_name', 'last_name', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        qs = User.objects.filter(deleted_at__isnull=True)

        # استبعاد حسابات المالك المطور (Superusers) من قائمة مستخدمي المدرسة/المستأجر
        include_superusers = self.request.query_params.get('include_superusers') in ['true', '1']
        if not include_superusers:
            qs = qs.filter(is_superuser=False)

        if tenant_id:
            qs = qs.filter(
                Q(roles__tenant_id=tenant_id) |
                Q(assignments__tenant_id=tenant_id) |
                Q(portal_user__tenant_id=tenant_id)
            ).distinct()

        # 1. تصفية الفئة / الدور (role_category / role)
        category = self.request.query_params.get('role_category') or self.request.query_params.get('role')
        if category:
            cat = category.lower().strip()
            if cat in ['parent', 'parents', 'أولياء الأمور']:
                qs = qs.filter(Q(roles__role__code='parent') | Q(portal_user__user_type='parent')).distinct()
            elif cat in ['teacher', 'teachers', 'faculty', 'المعلمون']:
                qs = qs.filter(Q(roles__role__code__in=['teacher', 'faculty'])).distinct()
            elif cat in ['admin', 'administration', 'administrator', 'الإدارة']:
                qs = qs.filter(Q(roles__role__code='administrator') | Q(is_staff=True)).distinct()
            elif cat in ['student', 'students', 'الطلاب']:
                qs = qs.filter(Q(roles__role__code='student') | Q(portal_user__user_type='student')).distinct()
            elif cat in ['staff', 'employee', 'employees', 'الموظفون']:
                qs = qs.filter(
                    ~Q(roles__role__code__in=['parent', 'student']) &
                    (Q(roles__role__category='custom') | Q(roles__role__code__in=['staff', 'accountant', 'hr', 'registrar']) | Q(is_staff=True))
                ).distinct()
            elif cat != 'all':
                qs = qs.filter(roles__role__code=cat).distinct()

        # 2. تصفية الحالة (status)
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'all':
            if status_param == 'locked':
                qs = qs.filter(Q(status='locked') | Q(lockout_until__gt=timezone.now()))
            else:
                qs = qs.filter(status=status_param)

        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateUserSerializer
        return UserSerializer

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """إحصائيات المستخدمين الإجمالية وتوزيعهم حسب الفئات والحالات للمستأجر الحالي."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        base_qs = User.objects.filter(deleted_at__isnull=True, is_superuser=False)
        if tenant_id:
            base_qs = base_qs.filter(
                Q(roles__tenant_id=tenant_id) |
                Q(assignments__tenant_id=tenant_id) |
                Q(portal_user__tenant_id=tenant_id)
            ).distinct()

        total = base_qs.count()
        parents = base_qs.filter(Q(roles__role__code='parent') | Q(portal_user__user_type='parent')).distinct().count()
        teachers = base_qs.filter(roles__role__code__in=['teacher', 'faculty']).distinct().count()
        admins = base_qs.filter(Q(roles__role__code='administrator') | Q(is_staff=True)).distinct().count()
        students = base_qs.filter(Q(roles__role__code='student') | Q(portal_user__user_type='student')).distinct().count()
        
        active_count = base_qs.filter(status='active', is_active=True).count()
        locked_count = base_qs.filter(Q(status='locked') | Q(lockout_until__gt=timezone.now())).count()
        suspended_count = base_qs.filter(status='suspended').count()

        return StandardResponse({
            'total_users': total,
            'parents_count': parents,
            'teachers_count': teachers,
            'admins_count': admins,
            'students_count': students,
            'staff_count': max(0, total - (parents + teachers + admins + students)),
            'active_count': active_count,
            'locked_count': locked_count,
            'suspended_count': suspended_count,
        })

    @action(detail=False, methods=['get', 'patch', 'put'], url_path='me', parser_classes=[MultiPartParser, FormParser, JSONParser])
    def me(self, request):
        user = request.user
        if request.method == 'GET':
            serializer = UserSerializer(user, context={'request': request})
            return StandardResponse(serializer.data)

        data = request.data.copy()
        if 'avatar' in request.FILES:
            user.avatar = request.FILES['avatar']
        elif data.get('remove_avatar') in [True, 'true', '1']:
            if user.avatar:
                user.avatar.delete(save=False)
            user.avatar = None

        import json
        if 'preferences' in data and isinstance(data['preferences'], str):
            try:
                data['preferences'] = json.loads(data['preferences'])
            except Exception:
                pass

        serializer = UserSerializer(user, data=data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return StandardResponse(serializer.data, message="تم تحديث بيانات الملف الشخصي بنجاح.")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        """تبديل حالة الحساب (نشط / موقوف) أو تعيين حالة محددة."""
        user = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            new_status = 'suspended' if user.status == 'active' else 'active'

        user.status = new_status
        user.is_active = (new_status == 'active')
        if new_status == 'active':
            user.failed_login_attempts = 0
            user.lockout_until = None
        user.save(update_fields=['status', 'is_active', 'failed_login_attempts', 'lockout_until'])

        status_labels = {'active': 'تفعيل', 'suspended': 'تعليق', 'locked': 'قفل', 'inactive': 'تعطيل'}
        label = status_labels.get(new_status, new_status)
        return StandardResponse(
            UserSerializer(user, context={'request': request}).data,
            message=f"تم {label} حساب المستخدم بنجاح."
        )

    @action(detail=True, methods=['post'], url_path='unlock')
    def unlock(self, request, pk=None):
        """فك قفل الحساب وإعادة تصفير محاولات الدخول الفاشلة."""
        user = self.get_object()
        user.status = 'active'
        user.is_active = True
        user.failed_login_attempts = 0
        user.lockout_until = None
        user.save(update_fields=['status', 'is_active', 'failed_login_attempts', 'lockout_until'])
        return StandardResponse(
            UserSerializer(user, context={'request': request}).data,
            message="تم إلغاء قفل الحساب وإعادة تفعيله بنجاح."
        )

    @action(detail=True, methods=['post'], url_path='admin-reset-password')
    def admin_reset_password(self, request, pk=None):
        """إعادة تعيين كلمة المرور للمستخدم بواسطة مدير النظام."""
        user = self.get_object()
        serializer = AdminSetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            new_password = serializer.validated_data['new_password']
            user.set_password(new_password)
            user.failed_login_attempts = 0
            user.lockout_until = None
            user.save(update_fields=['password', 'failed_login_attempts', 'lockout_until'])
            
            # إنهاء الجلسات الحالية لفرض تسجيل الدخول بكلمة المرور الجديدة
            UserSession.objects.filter(user=user, is_active=True).update(is_active=False)

            return StandardResponse(None, message="تم تحديث كلمة مرور المستخدم وإنهاء جلساته السابقة بنجاح.")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='terminate-sessions')
    def terminate_sessions(self, request, pk=None):
        """إنهاء جميع الجلسات النشطة للمستخدم فوراً."""
        user = self.get_object()
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        qs = UserSession.objects.filter(user=user, is_active=True)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        count = qs.update(is_active=False)
        return StandardResponse({'terminated_count': count}, message="تم تسجيل خروج المستخدم من جميع الأجهزة بنجاح.")

    @action(detail=True, methods=['post'], url_path='assign-roles')
    def assign_roles(self, request, pk=None):
        """تعيين وتعديل أدوار المستخدم للمستأجر الحالي."""
        user = self.get_object()
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        if not tenant_id:
            return Response({'error': 'معرف المستأجر غير متوفر.'}, status=status.HTTP_400_BAD_REQUEST)

        role_ids = request.data.get('role_ids', [])
        # إذا تم تمرير دور واحد عبر role_id
        if 'role_id' in request.data:
            role_ids = [request.data['role_id']]

        ensure_system_roles(tenant_id)

        # حذف الأدوار السابقة للمستأجر
        UserRole.objects.filter(user=user, tenant_id=tenant_id).delete()

        # إضافة الأدوار الجديدة
        for r_id in role_ids:
            try:
                role = Role.objects.get(id=r_id, tenant_id=tenant_id)
                UserRole.objects.create(user=user, role=role, tenant_id=tenant_id)
            except Role.DoesNotExist:
                pass

        PermissionCacheService.clear_user_permissions_cache(user.id, tenant_id)
        return StandardResponse(
            UserSerializer(user, context={'request': request}).data,
            message="تم تحديث أدوار المستخدم بنجاح."
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return StandardResponse(None, message="تم حذف المستخدم بنجاح.")

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk, deleted_at__isnull=False)
            user.restore()
            return StandardResponse(UserSerializer(user, context={'request': request}).data, message="تم استرجاع الحساب بنجاح.")
        except User.DoesNotExist:
            return Response({'error': 'المستخدم غير موجود أو غير محذوف.'}, status=status.HTTP_404_NOT_FOUND)


class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RoleSerializer

    def get_queryset(self):
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        if tenant_id:
            ensure_system_roles(tenant_id)
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
        
        cloned_role = Role.objects.create(
            tenant_id=tenant_id,
            name=new_name,
            code=new_code,
            category='custom',
            description=role.description,
            parent=role.parent
        )
        
        permissions = RolePermission.objects.filter(role=role)
        for p in permissions:
            RolePermission.objects.create(role=cloned_role, permission=p.permission)
            
        return StandardResponse(RoleSerializer(cloned_role).data, message="تم استنساخ الدور بنجاح.")


class PermissionMatrixView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        if tenant_id:
            ensure_system_roles(tenant_id)
        roles = Role.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)
        perms = Permission.objects.all().order_by('module', 'name')
        
        matrix = []
        for p in perms:
            assigned_roles = RolePermission.objects.filter(permission=p, role__in=roles).values_list('role_id', flat=True)
            matrix.append({
                'permission': PermissionSerializer(p).data,
                'role_ids': [str(r_id) for r_id in assigned_roles]
            })
            
        return StandardResponse({
            'roles': RoleSerializer(roles, many=True).data,
            'matrix': matrix,
            'permissions': PermissionSerializer(perms, many=True).data
        })

    def post(self, request):
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        role_id = request.data.get('role_id')
        permission_ids = request.data.get('permission_ids', [])
        
        try:
            role = Role.objects.get(id=role_id, tenant_id=tenant_id)
        except Role.DoesNotExist:
            return Response({'error': 'الدور المحدد غير موجود.'}, status=status.HTTP_404_NOT_FOUND)
            
        RolePermission.objects.filter(role=role).delete()
        for p_id in permission_ids:
            try:
                perm = Permission.objects.get(id=p_id)
                RolePermission.objects.create(role=role, permission=perm)
            except Permission.DoesNotExist:
                pass
                
        user_ids = UserRole.objects.filter(role=role, tenant_id=tenant_id).values_list('user_id', flat=True)
        for u_id in user_ids:
            PermissionCacheService.clear_user_permissions_cache(u_id, tenant_id)
            
        return StandardResponse(None, message="تم تحديث مصفوفة الصلاحيات بنجاح.")


class SecurityDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        
        active_sessions = UserSession.objects.filter(tenant_id=tenant_id, is_active=True).count()
        total_users = User.objects.filter(deleted_at__isnull=True).count()
        locked_users = User.objects.filter(status='locked').count()
        
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
