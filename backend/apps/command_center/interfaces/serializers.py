from rest_framework import serializers
from apps.command_center.domain.models import (
    Command, CommandCategory, RecentCommand, FavoriteCommand
)

class CommandCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CommandCategory
        fields = ['id', 'name_ar', 'name_en', 'code', 'created_at']


class CommandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Command
        fields = ['id', 'title_ar', 'title_en', 'category', 'action_type', 'target_route', 'is_active']


class RecentCommandSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecentCommand
        fields = ['id', 'user_id', 'command', 'last_executed']


class FavoriteCommandSerializer(serializers.ModelSerializer):
    class Meta:
        model = FavoriteCommand
        fields = ['id', 'user_id', 'command']
