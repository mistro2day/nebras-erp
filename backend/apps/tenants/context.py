import threading

_thread_locals = threading.local()

def set_current_tenant_id(tenant_id: int):
    """حفظ معرف المستأجر الحالي في سياق الخيط الحالي"""
    _thread_locals.tenant_id = tenant_id

def get_current_tenant_id() -> int | None:
    """استرجاع معرف المستأجر الحالي من سياق الخيط"""
    return getattr(_thread_locals, 'tenant_id', None)

def clear_current_tenant():
    """مسح سياق المستأجر الحالي"""
    if hasattr(_thread_locals, 'tenant_id'):
        del _thread_locals.tenant_id