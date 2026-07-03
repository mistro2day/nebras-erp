class BaseAppException(Exception):
    """الاستثناء الأساسي لجميع استثناءات التطبيق"""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class ValidationException(BaseAppException):
    def __init__(self, message: str):
        super().__init__(message, status_code=422)


class BusinessException(BaseAppException):
    def __init__(self, message: str):
        super().__init__(message, status_code=400)


class AuthorizationException(BaseAppException):
    def __init__(self, message: str = "غير مصرح لك بإجراء هذه العملية."):
        super().__init__(message, status_code=403)


class TenantException(BaseAppException):
    def __init__(self, message: str = "خطأ في تحديد أو عزل المستأجر."):
        super().__init__(message, status_code=400)


class NotFoundException(BaseAppException):
    def __init__(self, message: str = "العنصر المطلوب غير موجود."):
        super().__init__(message, status_code=404)