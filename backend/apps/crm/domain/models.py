from django.db import models
from django.conf import settings
from apps.shared.domain.models import CombinedSharedModel

class LeadSource(CombinedSharedModel):
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'nebras_crm_lead_sources'


class LeadStatus(CombinedSharedModel):
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'nebras_crm_lead_statuses'


class Lead(CombinedSharedModel):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50)
    source = models.ForeignKey(LeadSource, on_delete=models.SET_NULL, null=True)
    status = models.ForeignKey(LeadStatus, on_delete=models.SET_NULL, null=True)
    interest_level = models.CharField(max_length=20, default='medium') # low, medium, high
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_crm_leads'


class Prospect(CombinedSharedModel):
    lead = models.OneToOneField(Lead, on_delete=models.CASCADE, null=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50)
    interest_level = models.CharField(max_length=20, default='medium')
    stage = models.CharField(max_length=50, default='qualification') # qualification, proposal, interview, test, conversion

    class Meta:
        db_table = 'nebras_crm_prospects'


class Contact(CombinedSharedModel):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=50)

    class Meta:
        db_table = 'nebras_crm_contacts'


class OrganizationAccount(CombinedSharedModel):
    name = models.CharField(max_length=200)
    domain = models.CharField(max_length=100, blank=True, null=True)
    industry = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'nebras_crm_organization_accounts'


class Relationship(CombinedSharedModel):
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE)
    relationship_type = models.CharField(max_length=50) # parent, student, partner, employer, alumni

    class Meta:
        db_table = 'nebras_crm_relationships'


class ParentRelationship(CombinedSharedModel):
    relationship = models.OneToOneField(Relationship, on_delete=models.CASCADE)
    linked_student_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_crm_parent_relationships'


class StudentRelationship(CombinedSharedModel):
    relationship = models.OneToOneField(Relationship, on_delete=models.CASCADE)
    student_id = models.UUIDField()

    class Meta:
        db_table = 'nebras_crm_student_relationships'


class Partner(CombinedSharedModel):
    name = models.CharField(max_length=200)
    partner_type = models.CharField(max_length=50) # university, sponsor, training_center
    contact_person = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'nebras_crm_partners'


class Employer(CombinedSharedModel):
    organization = models.ForeignKey(OrganizationAccount, on_delete=models.CASCADE)
    company_name = models.CharField(max_length=200)

    class Meta:
        db_table = 'nebras_crm_employers'


class Alumni(CombinedSharedModel):
    student_id = models.UUIDField(unique=True)
    graduation_year = models.IntegerField()
    current_employer = models.ForeignKey(Employer, on_delete=models.SET_NULL, null=True, blank=True)
    achievements = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_crm_alumni'


class Campaign(CombinedSharedModel):
    name = models.CharField(max_length=200)
    campaign_type = models.CharField(max_length=50) # email, sms, event, admissions
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_crm_campaigns'


class CampaignMember(CombinedSharedModel):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='members')
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, null=True, blank=True)
    prospect = models.ForeignKey(Prospect, on_delete=models.CASCADE, null=True, blank=True)
    status = models.CharField(max_length=50, default='sent') # sent, opened, clicked, bounced

    class Meta:
        db_table = 'nebras_crm_campaign_members'


class MarketingActivity(CombinedSharedModel):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE)
    activity_name = models.CharField(max_length=150)
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)

    class Meta:
        db_table = 'nebras_crm_marketing_activities'


class CommunicationLog(CombinedSharedModel):
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE)
    channel = models.CharField(max_length=20) # phone, email, sms, meeting
    summary = models.CharField(max_length=255)
    details = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_crm_communication_logs'


class PhoneCall(CombinedSharedModel):
    log = models.OneToOneField(CommunicationLog, on_delete=models.CASCADE)
    duration_seconds = models.IntegerField(default=0)
    outcome = models.CharField(max_length=100) # answered, busy, no_answer

    class Meta:
        db_table = 'nebras_crm_phone_calls'


class EmailInteraction(CombinedSharedModel):
    log = models.OneToOneField(CommunicationLog, on_delete=models.CASCADE)
    subject = models.CharField(max_length=255)
    is_opened = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_crm_email_interactions'


class SMSInteraction(CombinedSharedModel):
    log = models.OneToOneField(CommunicationLog, on_delete=models.CASCADE)
    character_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_crm_sms_interactions'


class Meeting(CombinedSharedModel):
    log = models.OneToOneField(CommunicationLog, on_delete=models.CASCADE)
    location = models.CharField(max_length=200)
    scheduled_time = models.DateTimeField()

    class Meta:
        db_table = 'nebras_crm_meetings'


class Task(CombinedSharedModel):
    assigned_to = models.UUIDField(null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    due_date = models.DateTimeField()
    status = models.CharField(max_length=50, default='pending')

    class Meta:
        db_table = 'nebras_crm_tasks'


class Reminder(CombinedSharedModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True)
    remind_at = models.DateTimeField()
    is_sent = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_crm_reminders'


class FollowUp(CombinedSharedModel):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, null=True, blank=True)
    prospect = models.ForeignKey(Prospect, on_delete=models.CASCADE, null=True, blank=True)
    scheduled_date = models.DateTimeField()
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_crm_follow_ups'


class Opportunity(CombinedSharedModel):
    prospect = models.ForeignKey(Prospect, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    value = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    stage = models.CharField(max_length=50, default='prospecting')

    class Meta:
        db_table = 'nebras_crm_opportunities'


class Case(CombinedSharedModel):
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=50, default='open') # open, in_progress, resolved, closed
    priority = models.CharField(max_length=20, default='medium')

    class Meta:
        db_table = 'nebras_crm_cases'


class CaseComment(CombinedSharedModel):
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='comments')
    comment = models.TextField()
    is_internal = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_crm_case_comments'


class KnowledgeArticle(CombinedSharedModel):
    title = models.CharField(max_length=255)
    content = models.TextField()
    category = models.CharField(max_length=100)

    class Meta:
        db_table = 'nebras_crm_knowledge_articles'


class Survey(CombinedSharedModel):
    title = models.CharField(max_length=255)
    survey_type = models.CharField(max_length=50) # parent_satisfaction, student_satisfaction
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_crm_surveys'


class Feedback(CombinedSharedModel):
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='feedbacks')
    respondent_email = models.EmailField()
    rating = models.IntegerField()
    comments = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_crm_feedback'


class Complaint(CombinedSharedModel):
    case = models.OneToOneField(Case, on_delete=models.CASCADE)
    severity = models.CharField(max_length=20, default='medium')

    class Meta:
        db_table = 'nebras_crm_complaints'


class Suggestion(CombinedSharedModel):
    case = models.OneToOneField(Case, on_delete=models.CASCADE)
    category = models.CharField(max_length=100)

    class Meta:
        db_table = 'nebras_crm_suggestions'


class CRMSettings(CombinedSharedModel):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_crm_settings'


class CRMStatistics(CombinedSharedModel):
    metric_name = models.CharField(max_length=100)
    value = models.DecimalField(max_digits=12, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_crm_statistics'


class CRMAudit(CombinedSharedModel):
    user_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=150)
    details = models.TextField()

    class Meta:
        db_table = 'nebras_crm_audit'