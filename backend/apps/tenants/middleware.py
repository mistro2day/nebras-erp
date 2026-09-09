import re
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
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
        # فحص الحياة (Health Check) لا يحتاج مستأجراً ويجب ألا يلمس قاعدة البيانات،
        # حتى لا يتعطّل فحص Render عند بطء أو برودة قاعدة بيانات Neon.
        if request.path in ('/api/v1/health/', '/api/v1/health'):
            request.tenant = None
            request.tenant_id = None
            clear_current_tenant()
            return None

        host = request.get_host().split(':')[0]
        parts = host.split('.')
        tenant = None

        # 1. التعرف عبر ترويسة الطلب (مفيد للتطبيقات المحمولة وواجهات API للتطوير)
        tenant_id_header = request.headers.get('X-Tenant-ID')
        if tenant_id_header:
            try:
                tenant = Tenant.objects.get(id=tenant_id_header, is_active=True)
            except (ValueError, ObjectDoesNotExist):
                pass

        # 2. التعرف عبر النطاق الفرعي (Subdomain resolution)
        #    لا نُطبّق ذلك على نطاق منصة الـ API نفسه (مثل *.onrender.com) أو عناوين الـ IP (مثل 127.0.0.1)
        #    بل نعتمد على ترويسة X-Tenant-ID أو السقوط للمدرسة الواحدة.
        is_ip_address = len(parts) == 4 and all(p.isdigit() for p in parts)
        if not tenant and not _is_platform_host(host) and not is_ip_address and host != 'localhost' and len(parts) > 2:
            subdomain = parts[0]
            if subdomain not in ('www', 'api', 'admin'):
                try:
                    tenant = Tenant.objects.get(subdomain=subdomain, is_active=True)
                except ObjectDoesNotExist:
                    raise Http404("المدرسة المطلوبة غير موجودة أو تم تعطيلها.")

        # 3. نشر المدرسة الواحدة (Single-Tenant Fallback):
        # إن لم يُحل المستأجر عبر الترويسة أو النطاق الفرعي (كما في النشر على Vercel
        # بدون نطاقات فرعية)، وكان هناك مستأجر نشط واحد فقط، يُعتمد تلقائياً.
        if not tenant:
            active = list(Tenant.objects.filter(is_active=True)[:2])
            if len(active) == 1:
                tenant = active[0]

        if tenant:
            request.tenant = tenant
            request.tenant_id = tenant.id
            set_current_tenant_id(tenant.id)
        else:
            request.tenant = None
            request.tenant_id = None
            clear_current_tenant()

    def process_response(self, request, response):
        clear_current_tenant()
        return response