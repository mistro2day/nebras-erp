from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.db import IntegrityError
from django.core.exceptions import ValidationError as DjangoValidationError
from apps.common.responses import StandardResponse, StandardPagination
from apps.shared.interfaces.permissions import TenantPermission
import re
import uuid


def _friendly_integrity_message(exc, model_class=None):
    """تحويل خطأ قاعدة البيانات إلى رسالة عربية مفهومة.

    قيود التفرّد في النظام تشمل `tenant_id` الذي يُحقن عند الحفظ لا عند التحقق،
    فتفلت من تحقق DRF وتصل قاعدة البيانات. بدون هذه المعالجة يرى المستخدم
    «خطأ داخلي في الخادم» بدل معرفة أن الرمز مكرّر.
    """
    text = str(exc)
    if 'unique' not in text.lower() and 'duplicate' not in text.lower():
        return None

    # استخراج أسماء الأعمدة من: Key (tenant_id, code)=(...) already exists
    match = re.search(r'Key \(([^)]+)\)=', text)
    fields = []
    if match:
        fields = [f.strip() for f in match.group(1).split(',') if f.strip() != 'tenant_id']

    labels = []
    for name in fields:
        label = name
        if model_class is not None:
            try:
                label = model_class._meta.get_field(name).verbose_name or name
            except Exception:  # noqa: BLE001 — الحقل قد يكون عمود قاعدة بيانات لا حقل نموذج
                pass
        labels.append(str(label))

    if labels:
        return f"القيمة المدخلة في ({'، '.join(labels)}) مستخدمة بالفعل. اختر قيمة أخرى."
    return "القيمة المدخلة مستخدمة بالفعل. اختر قيمة أخرى."

class BaseCRUDViewSet(viewsets.ModelViewSet):
    """
    الـ ViewSet الأساسي للـ CRUD
    يدعم عزل المستأجرين تلقائياً، والترقيم القياسي، والاستجابة الموحدة.
    """
    permission_classes = [TenantPermission]
    pagination_class = StandardPagination

    def get_queryset(self):
        # تصفية السجلات بحسب المستأجر الحالي
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        qs = self.model_class.objects.filter(deleted_at__isnull=True)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    def get_create_defaults(self, request):
        """قيم يولّدها الخادم عند الإنشاء — تُمرَّر لـ save() ولا تُقبل من العميل.

        موضعها هنا لأن `create` يحفظ مباشرة ولا يمرّ بـ `perform_create`.
        تستخدمها الموديولات لتوليد أرقام المستندات (بلاغ، أمر عمل…).
        """
        return {}

    def create(self, request, *args, **kwargs):
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # حفظ الكيان مع ربط المستأجر الحالي، وأي قيم يولّدها الخادم (أرقام مستندات مثلاً)
        try:
            instance = serializer.save(
                tenant_id=tenant_id,
                created_by=request.user.id if request.user else None,
                **self.get_create_defaults(request),
            )
        except IntegrityError as exc:
            message = _friendly_integrity_message(exc, self.model_class)
            if message is None:
                raise
            raise DRFValidationError({'error': message})
        except DjangoValidationError as exc:
            raise DRFValidationError({'error': '، '.join(exc.messages)})

        return StandardResponse(
            data=self.get_serializer(instance).data,
            message="تم الحفظ بنجاح.",
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        try:
            instance = serializer.save(updated_by=request.user.id if request.user else None)
        except IntegrityError as exc:
            message = _friendly_integrity_message(exc, self.model_class)
            if message is None:
                raise
            raise DRFValidationError({'error': message})
        except DjangoValidationError as exc:
            raise DRFValidationError({'error': '، '.join(exc.messages)})

        return StandardResponse(
            data=self.get_serializer(instance).data,
            message="تم التعديل بنجاح."
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # تفعيل الحذف اللطيف (Soft Delete)
        instance.delete()
        return StandardResponse(
            data=None,
            message="تم الحذف بنجاح.",
            status=status.HTTP_200_OK
        )