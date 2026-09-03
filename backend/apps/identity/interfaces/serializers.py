from rest_framework import serializers
from apps.identity.domain.models import User, PasswordHistory
from apps.identity.domain.rbac import Role, Permission, UserRole, RolePermission
from apps.identity.domain.sessions import UserSession
from apps.identity.domain.user_assignment import UserAssignment

class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    role_codes = serializers.SerializerMethodField()
    primary_role = serializers.SerializerMethodField()
    user_type = serializers.SerializerMethodField()
    user_type_label = serializers.SerializerMethodField()
    active_sessions_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name', 'phone', 
            'national_id', 'avatar', 'avatar_url', 'language', 'user_timezone', 'emergency_contact', 
            'preferences', 'metadata', 'status', 'is_active', 'is_staff', 'is_superuser',
            'roles', 'role_codes', 'primary_role', 'user_type', 'user_type_label',
            'failed_login_attempts', 'lockout_until', 'active_sessions_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'avatar_url', 'full_name',
            'roles', 'role_codes', 'primary_role', 'user_type', 'user_type_label',
            'active_sessions_count', 'failed_login_attempts', 'lockout_until'
        ]

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name or obj.username or obj.email

    def _get_tenant_id(self):
        request = self.context.get('request')
        if request and hasattr(request, 'tenant') and request.tenant:
            return request.tenant.id
        return None

    def get_roles(self, obj):
        tenant_id = self._get_tenant_id()
        qs = obj.roles.all()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return [
            {
                'id': str(ur.role.id),
                'name': ur.role.name,
                'code': ur.role.code,
                'category': ur.role.category,
                'is_system': ur.role.is_system,
                'expires_at': ur.expires_at,
            }
            for ur in qs.select_related('role')
        ]

    def get_role_codes(self, obj):
        roles = self.get_roles(obj)
        return [r['code'] for r in roles]

    def get_user_type(self, obj):
        # 1. فحص بوابة المستخدمين إذا كان موجوداً
        if hasattr(obj, 'portal_user') and obj.portal_user:
            return obj.portal_user.user_type
        # 2. فحص أدوار النظام
        codes = self.get_role_codes(obj)
        if 'teacher' in codes or 'faculty' in codes:
            return 'teacher'
        # 3. فحص الارتباط بهيئة التدريس عبر البريد
        try:
            from apps.employees.domain.models import Employee
            from apps.faculty.domain.models import FacultyMember
            tenant_id = self._get_tenant_id()
            emp = Employee.objects.filter(email__iexact=obj.email, deleted_at__isnull=True).first()
            if emp and FacultyMember.objects.filter(employee_id=emp.id, deleted_at__isnull=True).exists():
                return 'teacher'
        except Exception:
            pass
        if 'administrator' in codes or obj.is_superuser:
            return 'admin'
        if obj.is_staff:
            return 'admin'
        if 'parent' in codes:
            return 'parent'
        if 'student' in codes:
            return 'student'
        return 'staff' if codes else 'general'

    def get_user_type_label(self, obj):
        t = self.get_user_type(obj)
        labels = {
            'admin': 'إداري / مشرف',
            'teacher': 'معلم / هيئة تدريس',
            'parent': 'ولي أمر',
            'student': 'طالب',
            'staff': 'كادر إداري وموظف',
            'applicant': 'متقدم جديد',
            'employee': 'موظف',
            'general': 'مستخدم عام',
        }
        return labels.get(t, 'مستخدم')

    def get_primary_role(self, obj):
        roles = self.get_roles(obj)
        if roles:
            return roles[0]['name']
        return self.get_user_type_label(obj)

    def get_active_sessions_count(self, obj):
        tenant_id = self._get_tenant_id()
        qs = obj.sessions.filter(is_active=True)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs.count()


class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, write_only=True
    )
    role_code = serializers.CharField(required=False, write_only=True)
    school_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    branch_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'phone', 
            'national_id', 'avatar', 'language', 'user_timezone', 'status',
            'password', 'role_ids', 'role_code', 'school_id', 'branch_id'
        ]

    def create(self, validated_data):
        import secrets
        import string

        role_ids = validated_data.pop('role_ids', [])
        role_code = validated_data.pop('role_code', None)
        school_id = validated_data.pop('school_id', None)
        branch_id = validated_data.pop('branch_id', None)
        password = validated_data.pop('password', None)

        if not password:
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
            password = ''.join(secrets.choice(alphabet) for _ in range(12))

        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()

        # حفظ التعيينات والأدوار إذا توفر مستأجر
        request = self.context.get('request')
        tenant_id = request.tenant.id if request and hasattr(request, 'tenant') and request.tenant else None

        if tenant_id:
            from apps.identity.domain.rbac import ensure_system_roles
            ensure_system_roles(tenant_id)

            if role_code:
                try:
                    role_obj = Role.objects.get(tenant_id=tenant_id, code=role_code)
                    UserRole.objects.get_or_create(user=user, role=role_obj, tenant_id=tenant_id)
                except Role.DoesNotExist:
                    pass

            for r_id in role_ids:
                try:
                    role_obj = Role.objects.get(tenant_id=tenant_id, id=r_id)
                    UserRole.objects.get_or_create(user=user, role=role_obj, tenant_id=tenant_id)
                except Role.DoesNotExist:
                    pass

            if school_id or branch_id:
                UserAssignment.objects.create(
                    user=user,
                    tenant_id=tenant_id,
                    school_id=school_id,
                    branch_id=branch_id,
                    is_primary=True,
                )

        return user


class RoleSerializer(serializers.ModelSerializer):
    permissions_count = serializers.IntegerField(source='permissions.count', read_only=True)
    permission_ids = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            'id', 'tenant_id', 'name', 'code', 'category', 'description', 
            'parent', 'is_system', 'permissions_count', 'permission_ids'
        ]
        read_only_fields = ['id', 'tenant_id', 'is_system', 'permissions_count']

    def get_permission_ids(self, obj):
        return list(obj.permissions.values_list('permission_id', flat=True))


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'code', 'type', 'module', 'resource', 'action', 'field_permissions', 'action_permissions']


class UserRoleAssignmentSerializer(serializers.Serializer):
    role_id = serializers.UUIDField()
    expires_at = serializers.DateTimeField(required=False, allow_null=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)


class AdminSetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=True, min_length=6)


class ResetPasswordEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ResetPasswordConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)


class UserAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAssignment
        fields = [
            'id', 'school_id', 'branch_id', 'campus_id', 
            'department_id', 'academic_department_id', 'administrative_department_id', 
            'is_primary'
        ]