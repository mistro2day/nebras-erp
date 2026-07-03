from apps.shared.application.services import BaseService
from datetime import datetime, time, date

class AttendanceCalculationService(BaseService):
    """
    خدمة احتساب التأخير والانصراف المبكر وقواعد السماح للحضور
    """
    @staticmethod
    def calculate_late_minutes(check_in_time: time, shift_start: time, grace_period_minutes: int = 15) -> int:
        if not check_in_time or not shift_start:
            return 0
        
        # تحويل التوقيت إلى دقائق لتسهيل الطرح والاحتساب
        check_in_mins = check_in_time.hour * 60 + check_in_time.minute
        shift_start_mins = shift_start.hour * 60 + shift_start.minute
        
        diff = check_in_mins - shift_start_mins
        if diff > grace_period_minutes:
            return diff
        return 0