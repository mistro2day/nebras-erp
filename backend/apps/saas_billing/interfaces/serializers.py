from rest_framework import serializers
from apps.saas_billing.domain.models import (
    SubscriptionPlan, TenantSubscription, Invoice, InvoiceLineItem, Payment,
    PaymentSubmission,
)


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    billing_cycle_display = serializers.CharField(source='get_billing_cycle_display', read_only=True)
    active_subscriptions = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_active_subscriptions(self, obj):
        return obj.subscriptions.filter(status='active').count()


class TenantSubscriptionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    plan_name = serializers.CharField(source='plan.name_ar', read_only=True)
    plan_price = serializers.DecimalField(source='plan.price', max_digits=15, decimal_places=2, read_only=True)
    plan_currency = serializers.CharField(source='plan.currency', read_only=True)
    tenant_name = serializers.SerializerMethodField()

    class Meta:
        model = TenantSubscription
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_tenant_name(self, obj):
        t = obj.tenant
        return (t.name_ar or t.name) if t else None


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLineItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'amount']


class PaymentSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source='get_method_display', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'tenant']


class PaymentSubmissionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    tenant_name = serializers.SerializerMethodField()
    invoice_number = serializers.CharField(source='invoice.number', read_only=True)

    class Meta:
        model = PaymentSubmission
        fields = '__all__'
        read_only_fields = ['id', 'tenant', 'status', 'submitted_by', 'reviewed_by',
                            'reviewed_at', 'payment', 'created_at', 'updated_at']

    def get_tenant_name(self, obj):
        t = obj.tenant
        return (t.name_ar or t.name) if t else None


class InvoiceSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    tenant_name = serializers.SerializerMethodField()
    balance_due = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['id', 'number', 'created_at', 'updated_at',
                            'subtotal', 'total', 'amount_paid']

    def get_tenant_name(self, obj):
        t = obj.tenant
        return (t.name_ar or t.name) if t else None
