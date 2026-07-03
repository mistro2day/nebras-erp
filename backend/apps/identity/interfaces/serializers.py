from rest_framework import serializers
from apps.identity.domain.models import User, PasswordHistory
from apps.identity.domain.rbac import Role, Permission, UserRole, RolePermission
from apps.identity.domain.sessions import UserSession
from apps.identity.domain.user_assignment import UserAssignment

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'phone', 
            'national_id', 'avatar', 'language', 'user_timezone', 'emergency_contact', 
            'preferences', 'metadata', 'status', 'is_active', 'is_staff', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'phone', 
            'national_id', 'avatar', 'language', 'user_timezone', 'password'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class RoleSerializer(serializers.ModelSerializer):
    permissions_count = serializers.IntegerField(source='permissions.count', read_only=True)

    class Meta:
        model = Role
        fields = ['id', 'tenant_id', 'name', 'code', 'category', 'description', 'parent', 'is_system', 'permissions_count']
        read_only_fields = ['id', 'tenant_id', 'is_system']


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