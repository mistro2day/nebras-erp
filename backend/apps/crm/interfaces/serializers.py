from rest_framework import serializers
from apps.crm.domain.models import (
    Lead, LeadSource, LeadStatus, Prospect, Contact, Campaign, Case, Survey, Feedback, KnowledgeArticle
)


class KnowledgeArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeArticle
        fields = ['id', 'title', 'content', 'category', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class LeadSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadSource
        fields = ['id', 'name_ar', 'name_en', 'code']


class LeadStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadStatus
        fields = ['id', 'name_ar', 'name_en', 'code']


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'source', 'status', 'interest_level', 'notes', 'created_at']


class ProspectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prospect
        fields = ['id', 'lead', 'first_name', 'last_name', 'email', 'phone', 'interest_level', 'stage', 'created_at']


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'first_name', 'last_name', 'email', 'phone']


class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = ['id', 'name', 'campaign_type', 'start_date', 'end_date', 'is_active']


class CaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = ['id', 'contact', 'subject', 'description', 'status', 'priority', 'created_at']


class SurveySerializer(serializers.ModelSerializer):
    class Meta:
        model = Survey
        fields = ['id', 'title', 'survey_type', 'is_active']


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ['id', 'survey', 'respondent_email', 'rating', 'comments', 'created_at']
