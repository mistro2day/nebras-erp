import os
import uuid
from django.utils import timezone
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.files.storage import default_storage
from apps.document_management.domain.models import (
    Document, DocumentVersion, DocumentFolder, FolderPermission,
    DocumentLock, DocumentCheckout, DocumentArchive, DocumentAccessLog, DocumentReference
)

class DocumentStorageService:
    @staticmethod
    def upload_file(tenant_id, folder_id, title, file_obj, owner_id):
        """
        رفع ملف جديد وتخزينه في المجلد النشط وتوليد الإصدار 1.0 له.
        """
        if folder_id:
            try:
                qs = DocumentFolder.objects.filter(id=folder_id)
                if tenant_id:
                    qs = qs.filter(tenant_id=tenant_id)
                folder = qs.first()
                if not folder:
                    raise ValidationError("المجلد المحدد غير موجود.")
            except Exception:
                pass

        # تخزين الملف في مجلد التخزين المخصص
        t_path = f"tenant_{tenant_id}" if tenant_id else "tenant_default"
        relative_path = f"{t_path}/dms/{uuid.uuid4()}_{file_obj.name}"
        saved_path = default_storage.save(relative_path, file_obj)

        # إنشاء سجل الوثيقة
        document = Document.objects.create(
            tenant_id=tenant_id,
            title=title,
            folder_id=folder_id,
            current_version_number='1.0',
            owner_id=owner_id,
            file_size_bytes=file_obj.size
        )

        # إنشاء الإصدار الأول
        DocumentVersion.objects.create(
            tenant_id=tenant_id,
            document=document,
            version_number='1.0',
            file_path=saved_path,
            change_log="الإصدار المبدئي للمستند",
            author_id=owner_id
        )

        # تسجيل الدخول
        try:
            DocumentAccessLog.objects.create(
                tenant_id=tenant_id,
                document=document,
                user_id=owner_id,
                access_type='upload'
            )
        except Exception:
            pass

        return document

    @staticmethod
    def add_new_version(tenant_id, document_id, file_obj, author_id, change_log, is_major=False):
        """
        إضافة إصدار جديد لوثيقة موجودة (تحديث إصدار فرعي أو رئيسي).
        """
        qs = Document.objects.filter(id=document_id)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        document = qs.first()
        if not document:
            raise ValidationError("المستند غير موجود.")

        # فحص القفل
        if document.is_locked:
            lock = DocumentLock.objects.filter(document=document).first()
            if lock and author_id and str(lock.locked_by) != str(author_id):
                raise PermissionDenied("المستند مقفل حالياً بواسطة مستخدم آخر.")

        # حساب رقم الإصدار الجديد
        try:
            curr_major, curr_minor = map(int, document.current_version_number.split('.'))
        except Exception:
            curr_major, curr_minor = 1, 0

        if is_major:
            new_version_str = f"{curr_major + 1}.0"
        else:
            new_version_str = f"{curr_major}.{curr_minor + 1}"

        # تخزين الملف
        t_path = f"tenant_{tenant_id}" if tenant_id else "tenant_default"
        relative_path = f"{t_path}/dms/{uuid.uuid4()}_{file_obj.name}"
        saved_path = default_storage.save(relative_path, file_obj)

        # تحديث المستند
        document.current_version_number = new_version_str
        document.file_size_bytes = file_obj.size
        document.save()

        # إنشاء الإصدار الجديد
        version = DocumentVersion.objects.create(
            tenant_id=tenant_id,
            document=document,
            version_number=new_version_str,
            file_path=saved_path,
            change_log=change_log,
            author_id=author_id
        )

        return version


class DocumentLockService:
    @staticmethod
    def lock_document(tenant_id, document_id, user_id):
        qs = Document.objects.filter(id=document_id)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        document = qs.first()
        if not document:
            raise ValidationError("المستند غير موجود.")

        if document.is_locked:
            raise ValidationError("المستند مقفل بالفعل.")

        document.is_locked = True
        document.save()

        try:
            DocumentLock.objects.create(
                tenant_id=tenant_id,
                document=document,
                locked_by=user_id
            )
            DocumentCheckout.objects.create(
                tenant_id=tenant_id,
                document=document,
                user_id=user_id
            )
        except Exception:
            pass

    @staticmethod
    def unlock_document(tenant_id, document_id, user_id):
        qs = Document.objects.filter(id=document_id)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        document = qs.first()
        if not document:
            return

        if not document.is_locked:
            return

        lock = DocumentLock.objects.filter(document=document).first()
        if lock and user_id and str(lock.locked_by) != str(user_id):
            raise PermissionDenied("لا يمكنك فك قفل مستند قفله مستخدم آخر.")

        document.is_locked = False
        document.save()

        if lock:
            lock.delete()



class DmsLinkService:
    @staticmethod
    def link_document(tenant_id, document_id, entity_type, entity_id):
        """
        ربط مستند بكيان آخر (طالب، موظف، زيارة طبية، فاتورة، إلخ)
        """
        qs = Document.objects.filter(id=document_id)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        document = qs.first()
        if not document:
            raise ValidationError("المستند المحدد غير موجود.")

        ref = DocumentReference.objects.create(
            tenant_id=tenant_id,
            document=document,
            entity_type=entity_type,
            entity_id=entity_id
        )
        return ref


    @staticmethod
    def get_entity_documents(tenant_id, entity_type, entity_id):
        """
        استرجاع جميع المستندات المرتبطة بكيان معين
        """
        refs = DocumentReference.objects.filter(
            tenant_id=tenant_id,
            entity_type=entity_type,
            entity_id=entity_id
        ).select_related('document')
        return [ref.document for ref in refs]

