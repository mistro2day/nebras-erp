from django.conf import settings
from django.http import Http404
from django.utils.deprecation import MiddlewareMixin
from apps.tenants.domain.models import Tenant
from apps.tenants.context import set_current_tenant_id, clear_current_tenant

# النطاقات التي تمثّل منصة الـ API نفسها (وليس مدرسة فرعية).
# تُعرَّف عبر الإعداد، وتتخلف إلى نطاق Render التجريبي.
PLATFORM_HOST_SUFFIXES = getattr(
    settings, 'TENANT_PLATFORM_HOST_SUFFIXES', ['.onrender.com']
)


def _is_platform_host(host):
    return any(host.endswith(suffix) for suffix in PLATFORM_HOST_SUFFIXES)


class TenantMiddleware(MiddlewareMixin):
    """
    ميدلوير للتعرف التلقائي على المدرسة (المستأجر) بناءً على النطاق الفرعي (Subdomain)
    أو عبر ترويسة الطلب X-Tenant-ID
    """
    def process_request(self, request):
        host = request.get_host().split(':')[0]
        parts = host.split('.')
        tenant = None

        # 1. التعرف عبر ترويسة الطلب (مفيد للتطبيقات المحمولة وواجهات API للتطوير)
        tenant_id_header = request.headers.get('X-Tenant-ID')
        if tenant_id_header:
            try:
                tenant = Tenant.objects.get(id=tenant_id_header, is_active=True)
            except (ValueError, Tenant.DoesNotExist):
                pass

        # 2. التعرف عبر النطاق الفرعي (Subdomain resolution)
        #    لا نُطبّق ذلك على نطاق منصة الـ API نفسه (مثل *.onrender.com)
        #    بل نعتمد على ترويسة X-Tenant-ID لتمرير المستأجر.
        if not tenant and not _is_platform_host(host) and len(parts) > 2:
            subdomain = parts[0]
            if subdomain not in ('www', 'api', 'admin'):
                try:
                    tenant = Tenant.objects.get(subdomain=subdomain, is_active=True)
                except Tenant.DoesNotExist:
                    raise Http404("المدرسة المطلوبة غير موجودة أو تم تعطيلها.")

        if tenant:
            request.tenant = tenant
            set_current_tenant_id(tenant.id)
        else:
            request.tenant = None
            clear_current_tenant()

    def process_response(self, request, response):
        clear_current_tenant()
        return response