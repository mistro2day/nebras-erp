"""
واجهات AI التجريدية المستقبلية لموديول التقارير والتحليلات.
"""
from abc import ABC, abstractmethod


class NaturalLanguageQueryInterface(ABC):
    """
    الاستعلام باللغة الطبيعية (NLQ).
    مستقبلاً: يحول استعلام المستخدم باللغة العربية إلى استعلام SQL أو معاملات تقرير.
    """

    @abstractmethod
    def ask(self, question: str, context: dict) -> dict:
        """
        تحويل السؤال إلى هيكل استعلام.
        
        Args:
            question: السؤال باللغة العربية (مثال: "ما هي نسبة غياب الطلاب في مدرسة العروبة هذا الأسبوع؟")
            context: سياق المستأجر والصلاحيات المتاحة.
        """
        pass


class AutomatedInsightsInterface(ABC):
    """
    تحليلات وتنبيهات ذكية تلقائية.
    مستقبلاً: يكتشف التغيرات غير العادية أو الشذوذ في البيانات.
    """

    @abstractmethod
    def generate_insights(self, dataset_id: str, history_data: list) -> list:
        """توليد رؤى تحليلية مكتوبة ومقترحة للمستخدم."""
        pass


class ForecastInterface(ABC):
    """
    تنبؤات ودراسات مستقبلية.
    مستقبلاً: يحلل السلاسل الزمنية للتنبؤ بالمؤشرات والتدفقات المالية أو أعداد الطلاب.
    """

    @abstractmethod
    def predict(self, history_metrics: list, periods: int) -> list:
        """التنبؤ بالقيم المستقبلية لمؤشر أداء محدد."""
        pass
