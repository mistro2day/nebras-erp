"""
واجهات الذكاء الاصطناعي التجريدية لمستقبل موديول الامتحانات.
"""
from abc import ABC, abstractmethod


class QuestionGenerationInterface(ABC):
    """
    توليد الأسئلة الأكاديمية تلقائياً.
    مستقبلاً: يولد الأسئلة بناءً على المنهج الدراسي ومستويات الصعوبة.
    """

    @abstractmethod
    def generate_questions(self, subject_id: str, topic: str, difficulty: str, count: int) -> list:
        pass


class PerformancePredictionInterface(ABC):
    """
    التنبؤ بأداء الطلاب وتحديد المتعثرين أكاديمياً.
    مستقبلاً: يحلل درجات الامتحانات والتقييمات للتنبؤ بمعدلات النجاح والرسوب وتوجيه الإرشادات.
    """

    @abstractmethod
    def predict_student_grade(self, student_id: str, subject_id: str) -> dict:
        pass
