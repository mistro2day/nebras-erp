import re
from django.core.exceptions import ValidationError
from django.utils import timezone

def validate_saudi_phone(value: str):
    """التحقق من صحة رقم الهاتف السعودي (+9665xxxxxxxx أو 05xxxxxxxx)"""
    pattern = r'^(?:\+966|0)?5[0-9]{8}$'
    if not re.match(pattern, value):
        raise ValidationError("رقم الجوال المدخل غير صحيح. يجب أن يتوافق مع صيغة الجوال السعودي.")


def validate_national_id(value: str):
    """التحقق من صحة الهوية الوطنية السعودية أو الإقامة (10 خانات تبدأ بـ 1 أو 2)"""
    pattern = r'^[12][0-9]{9}$'
    if not re.match(pattern, value):
        raise ValidationError("رقم الهوية الوطنية أو الإقامة غير صحيح. يجب أن يتكون من 10 أرقام.")


def validate_future_date(value):
    """التحقق من أن التاريخ في المستقبل"""
    if value < timezone.now().date():
        raise ValidationError("يجب أن يكون التاريخ في المستقبل.")


def validate_past_date(value):
    """التحقق من أن التاريخ في الماضي"""
    if value > timezone.now().date():
        raise ValidationError("يجب أن يكون التاريخ في الماضي.")