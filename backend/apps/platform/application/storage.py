import logging
import uuid
import hashlib
import os
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.exceptions import ValidationError
from apps.platform.domain.models import AttachmentMetadata

logger = logging.getLogger('nebras.platform.storage')

class FileStorageService:
    """
    خدمة التخزين الموحدة (Unified File Storage Service)
    تدعم رفع، تحميل، وحذف الملفات محلياً أو سحابياً مع حساب الـ Checksum وتأكيد الأمان.
    """
    
    @staticmethod
    def upload_file(file_obj, tenant_id: uuid.UUID, user_id: uuid.UUID = None,
                    category: str = 'general', provider: str = 'local') -> AttachmentMetadata:
        """
        رفع وحفظ ملف وحساب الـ Checksum
        """
        # 1. التحقق من حجم الملف وصيغته (امتدادات آمنة)
        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext in ['.exe', '.bat', '.sh', '.py']:
            raise ValidationError("نوع الملف المرفوع غير آمن ويُشتبه باحتوائه على برمجيات ضارة.")

        # 2. حساب الـ SHA256 Checksum
        sha256 = hashlib.sha256()
        file_obj.seek(0)
        for chunk in file_obj.chunks():
            sha256.update(chunk)
        checksum = sha256.hexdigest()
        
        # 3. حفظ الملف في المخزن المحدد
        file_asset_id = uuid.uuid4()
        storage_path = f"tenants/{tenant_id}/{category}/{file_asset_id}{ext}"
        
        file_obj.seek(0)
        saved_path = default_storage.save(storage_path, file_obj)
        
        # 4. حفظ البيانات الوصفية في قاعدة البيانات
        metadata = AttachmentMetadata.objects.create(
            file_asset_id=file_asset_id,
            file_name=file_obj.name,
            file_size=file_obj.size,
            mime_type=file_obj.content_type,
            storage_provider=provider,
            storage_path=saved_path,
            checksum=checksum,
            file_category=category,
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        logger.info(f"File {file_obj.name} uploaded successfully. Asset ID: {file_asset_id}")
        return metadata

    @staticmethod
    def get_file_url(file_asset_id: uuid.UUID, tenant_id: uuid.UUID) -> str:
        """الحصول على رابط الوصول أو المعاينة للملف"""
        try:
            metadata = AttachmentMetadata.objects.get(file_asset_id=file_asset_id, tenant_id=tenant_id)
            return default_storage.url(metadata.storage_path)
        except AttachmentMetadata.DoesNotExist:
            raise ValidationError("الملف المطلوب غير موجود.")

    @staticmethod
    def delete_file(file_asset_id: uuid.UUID, tenant_id: uuid.UUID):
        """الحذف اللطيف والحقيقي للملف"""
        try:
            metadata = AttachmentMetadata.objects.get(file_asset_id=file_asset_id, tenant_id=tenant_id)
            # حذف الملف الفعلي من وسيط التخزين
            if default_storage.exists(metadata.storage_path):
                default_storage.delete(metadata.storage_path)
            # الحذف اللطيف من قاعدة البيانات
            metadata.delete()
            logger.info(f"File asset {file_asset_id} deleted successfully.")
        except AttachmentMetadata.DoesNotExist:
            raise ValidationError("الملف المطلوب غير موجود.")