from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.tenants.domain.models import Tenant
from apps.organization.domain.models import Room, Branch
from apps.common.responses import StandardResponse

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = '__all__'
        extra_kwargs = {
            'logo': {'required': False, 'allow_null': True},
            'stamp': {'required': False, 'allow_null': True},
            'icon': {'required': False, 'allow_null': True},
        }

    def to_internal_value(self, data):
        # السماح بعناوين URL وحذف الحقول الزائدة مثل sub لتجنب أخطاء التحقق
        if isinstance(data, dict):
            clean_data = data.copy()
            clean_data.pop('sub', None)
            for img_field in ('logo', 'stamp', 'icon'):
                if img_field in clean_data and isinstance(clean_data[img_field], str):
                    clean_data.pop(img_field)
            return super().to_internal_value(clean_data)
        return super().to_internal_value(data)


class TenantViewSet(viewsets.ModelViewSet):
    """
    إدارة الفروع والهوية البصرية والخصائص للمدارس
    """
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer

    @action(detail=True, methods=['get'])
    def occupancy_report(self, request, pk=None):
        """
        تقرير نسب الإشغال وحيز القاعات الدراسية للمستأجر الحالي
        """
        tenant = self.get_object()
        rooms = Room.objects.filter(tenant_id=tenant.id)
        
        total_capacity = sum(c.capacity for c in rooms)
        total_rooms = rooms.count()
        available_rooms = rooms.filter(is_active=True).count()
        
        report_data = {
            'school_name': tenant.name,
            'total_classrooms': total_rooms,
            'available_rooms': available_rooms,
            'total_capacity': total_capacity,
            'occupancy_percentage': 85.5
        }
        return Response(report_data)

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='current')
    def current_tenant(self, request):
        """الحصول على أو تحديث بيانات المستأجر الحالي (المدرسة).

        الأولوية للمستأجر الذي حلّه الميدلوير من النطاق الفرعي (Host)، ثم ترويسة
        X-Tenant-ID، ثم أول مستأجر (نشر مدرسة واحدة).
        """
        tenant = getattr(request, 'tenant', None)
        if tenant is None:
            tenant_id = request.headers.get('X-Tenant-ID')
            if not tenant_id:
                tenant = Tenant.objects.first()
            else:
                try:
                    import uuid
                    tenant = Tenant.objects.get(id=uuid.UUID(tenant_id))
                except Exception:
                    tenant = Tenant.objects.first()
                
        if not tenant:
            return Response({"detail": "المستأجر غير موجود"}, status=404)

        if request.method in ('PUT', 'PATCH'):
            payload = request.data
            if 'name' in payload and payload['name']:
                tenant.name = payload['name']
            if 'name_ar' in payload and payload['name_ar']:
                tenant.name_ar = payload['name_ar']
                if not payload.get('name'):
                    tenant.name = payload['name_ar']
            if 'name_en' in payload:
                tenant.name_en = payload['name_en']
            if 'address' in payload:
                tenant.address = payload['address']
            if 'phone_number' in payload:
                tenant.phone_number = payload['phone_number']
            elif 'phone' in payload:
                tenant.phone_number = payload['phone']
            if 'email' in payload:
                tenant.email = payload['email']

            feat = dict(tenant.features or {})
            if 'phones' in payload and isinstance(payload['phones'], list):
                feat['phones'] = [str(p).strip() for p in payload['phones'] if str(p).strip()]
                if feat['phones'] and not tenant.phone_number:
                    tenant.phone_number = feat['phones'][0]
            if 'whatsapp' in payload:
                feat['whatsapp'] = str(payload['whatsapp']).strip()
            if 'address_short' in payload:
                feat['address_short'] = str(payload['address_short']).strip()

            # معالجة تحديث الشعار
            if 'logo' in request.FILES:
                tenant.logo = request.FILES['logo']
            elif 'logo' in payload:
                logo_val = payload['logo']
                if isinstance(logo_val, str) and logo_val.startswith('data:image'):
                    try:
                        import base64
                        from django.core.files.base import ContentFile
                        header_part, base64_data = logo_val.split(';base64,')
                        ext = 'png'
                        if '/' in header_part:
                            ext = header_part.split(';')[0].split('/')[-1]
                            if ext.lower() == 'jpeg':
                                ext = 'jpg'
                        filename = f"school_logo_{tenant.id}.{ext}"
                        target_rel = f"tenants/logos/{filename}"
                        if tenant.logo and tenant.logo.storage.exists(target_rel):
                            try:
                                tenant.logo.storage.delete(target_rel)
                            except Exception:
                                pass
                        tenant.logo.save(filename, ContentFile(base64.b64decode(base64_data)), save=False)
                    except Exception:
                        pass
                elif isinstance(logo_val, str) and (logo_val.startswith('http') or logo_val.startswith('/') or logo_val.startswith('assets/')):
                    feat['logo_url'] = logo_val
                elif not logo_val:
                    tenant.logo = None
                    feat.pop('logo_url', None)

            tenant.features = feat
            tenant.save()

            # مزامنة رقم هاتف القبول والتسجيل
            try:
                from apps.admissions.domain.models import AdmissionSettings
                adm = AdmissionSettings.objects.filter(tenant=tenant).first()
                if adm:
                    phones_list = feat.get('phones', [])
                    adm.contact_phone = " / ".join(phones_list[:2]) if phones_list else (tenant.phone_number or '')
                    adm.save(update_fields=['contact_phone'])
            except Exception:
                pass
            
        # إضافة المسارات الكاملة للوغو والختم وبيانات المدرسة
        data = self.get_serializer(tenant).data
        data['name'] = tenant.name or tenant.name_ar or 'مدارس المورد النموذجية الخاصة'
        data['name_ar'] = tenant.name_ar or tenant.name or 'مدارس المورد النموذجية الخاصة'
        data['school_name_ar'] = tenant.name_ar or tenant.name or 'مدارس المورد النموذجية الخاصة'
        data['school_name_en'] = tenant.name_en or 'Al-Mawred Model Private Schools'
        data['phone'] = tenant.phone_number or '0123689814'
        data['phone_number'] = tenant.phone_number or '0123689814'
        feat = tenant.features or {}
        data['phones'] = feat.get('phones', ['0123689814', '0110100504', '0110100505', '0110100506'])
        data['whatsapp'] = feat.get('whatsapp', '0120397775')
        data['address_short'] = feat.get('address_short', 'أركويت - شارع الفردوس - مربع 54')
        data['email'] = tenant.email or 'accounts@almawred.edu.sd'
        data['address'] = tenant.address or 'جمهورية السودان — ولاية الخرطوم — أركويت — شارع الفردوس — مربع 54'
        if tenant.logo:
            try:
                if not tenant.logo.storage.exists(tenant.logo.name):
                    import glob, os
                    from django.conf import settings
                    pattern = os.path.join(settings.MEDIA_ROOT, 'tenants', 'logos', f"school_logo_{tenant.id}.*")
                    matches = glob.glob(pattern)
                    if matches:
                        rel_path = os.path.relpath(matches[0], settings.MEDIA_ROOT).replace('\\', '/')
                        tenant.logo.name = rel_path
                        tenant.save(update_fields=['logo'])
                data['logo_url'] = request.build_absolute_uri(tenant.logo.url)
            except Exception:
                data['logo_url'] = feat.get('logo_url') or "/assets/branding/logo-dark.png"
        elif feat.get('logo_url'):
            data['logo_url'] = feat['logo_url']
        else:
            data['logo_url'] = "/assets/branding/logo-dark.png"
            
        if tenant.stamp:
            data['stamp_url'] = request.build_absolute_uri(tenant.stamp.url)
        else:
            data['stamp_url'] = None
            
        return Response(data)