from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger('nebras.api')

class BusinessException(Exception):
    """الاستثناء البرمجي الأساسي للعمليات التجارية وقواعد العمل"""
    def __init__(self, message, code='business_error', status_code=status.HTTP_400_BAD_REQUEST):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def custom_exception_handler(exc, context):
    """
    معالجة الاستثناءات الموحد لضمان ردود API قياسية وثابتة (Unified Error Format)
    """
    # 1. استدعاء معالج الاستثناءات الافتراضي لـ DRF
    response = exception_handler(exc, context)

    # 2. معالجة الاستثناءات المخصصة لقواعد العمل (BusinessException)
    if isinstance(exc, BusinessException):
        return Response({
            'success': False,
            'error': {
                'code': exc.code,
                'message': exc.message,
                'details': None
            }
        }, status=exc.status_code)

    # معالجة استثناءات مكتبة التأسيس المشتركة (BaseAppException)
    from apps.shared.domain.exceptions import BaseAppException
    if isinstance(exc, BaseAppException):
        return Response({
            'success': False,
            'error': {
                'code': exc.__class__.__name__.lower().replace('exception', '_error'),
                'message': exc.message,
                'details': None
            }
        }, status=exc.status_code)


    # 3. تعديل صيغة استثناءات DRF الافتراضية
    if response is not None:
        details = response.data
        message = "حدث خطأ أثناء معالجة الطلب."
        if isinstance(details, dict):
            if 'detail' in details:
                message = details['detail']
                del details['detail']
        elif isinstance(details, list) and len(details) > 0:
            message = details[0]

        response.data = {
            'success': False,
            'error': {
                'code': 'validation_error' if response.status_code == 400 else 'server_error',
                'message': message,
                'details': details
            }
        }
    else:
        # تسجيل الاستثناءات غير المتوقعة (مثل أخطاء النظام 500)
        logger.error(f"Internal Server Error: {str(exc)}", exc_info=True)
        return Response({
            'success': False,
            'error': {
                'code': 'server_error',
                'message': 'حدث خطأ داخلي في الخادم، يرجى المحاولة لاحقاً.',
                'details': None
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return response