from rest_framework import serializers
from apps.core_business.domain.models import Attachment, AttachmentVersion, Comment, Activity, ApprovalRequest, Tag, LookupCategory, LookupValue

class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = '__all__'

class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = '__all__'

class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = '__all__'

class ApprovalRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalRequest
        fields = '__all__'

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = '__all__'

class LookupCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LookupCategory
        fields = '__all__'

class LookupValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = LookupValue
        fields = '__all__'