import logging
import uuid
from apps.platform.domain.models import AuditLog

logger = logging.getLogger('nebras.platform.audit')

class AuditEngine:
    """
    محرك التدقيق المركزي (Centralized Audit Engine) لتسجيل وتتبع العمليات وتغيرات القيم
    """
    
    @staticmethod
    def log_action(user_id: uuid.UUID, action: str, entity_name: str, entity_id: uuid.UUID = None,
                   old_values: dict = None, new_values: dict = None, ip_address: str = None,
                   browser: str = None, device: str = None, tenant_id: uuid.UUID = None,
                   severity: str = 'info') -> AuditLog:
        """
        تسجيل نشاط تدقيق في قاعدة البيانات
        """
        log_entry = AuditLog.objects.create(
            user_id=user_id,
            action=action,
            entity_name=entity_name,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            browser=browser,
            device=device,
            severity=severity,
            tenant_id=tenant_id,
            created_by=user_id
        )
        logger.info(f"[AUDIT LOG] User {user_id} performed '{action}' on entity '{entity_name}' (ID: {entity_id})")
        return log_entry