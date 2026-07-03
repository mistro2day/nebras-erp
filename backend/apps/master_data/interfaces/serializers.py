from rest_framework import serializers
from apps.master_data.domain.models import MasterCategory, MasterItem, MasterTranslation
from apps.master_data.application.services import HierarchyValidationService

class MasterCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MasterCategory
        fields = '__all__'

class MasterItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MasterItem
        fields = '__all__'

    def validate(self, attrs):
        # التحقق من الدوران الحلقي عند وجود أب للكيان
        parent = attrs.get('parent')
        instance = self.instance
        if instance and parent:
            if HierarchyValidationService.check_circular_reference(instance.id, parent.id):
                raise serializers.ValidationError("حدث خطأ: لا يمكن ربط الكيان المرجعي بشكل حلقي (Circular Reference).")
        return attrs

class MasterTranslationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MasterTranslation
        fields = '__all__'