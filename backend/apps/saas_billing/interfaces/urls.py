from rest_framework.routers import DefaultRouter
from apps.saas_billing.interfaces.views import (
    SubscriptionPlanViewSet, TenantSubscriptionViewSet, InvoiceViewSet,
    BillingDashboardView, PaymentSubmissionViewSet,
)

router = DefaultRouter()
router.register('plans', SubscriptionPlanViewSet, basename='saas-plan')
router.register('subscriptions', TenantSubscriptionViewSet, basename='saas-subscription')
router.register('invoices', InvoiceViewSet, basename='saas-invoice')
router.register('payment-submissions', PaymentSubmissionViewSet, basename='saas-payment-submission')
router.register('dashboard', BillingDashboardView, basename='saas-dashboard')

urlpatterns = router.urls
