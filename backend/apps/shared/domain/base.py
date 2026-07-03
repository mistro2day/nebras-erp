import uuid
from typing import Any, Generic, TypeVar, Optional, List, Callable

T = TypeVar('T')

class DomainException(Exception):
    """الاستثناء الأساسي لنطاق العمل التجاري"""
    pass


class BusinessRule:
    """قاعدة عمل تشغيلية يجب التحقق منها"""
    def is_broken(self) -> bool:
        raise NotImplementedError()
        
    def get_message(self) -> str:
        raise NotImplementedError()


class Result(Generic[T]):
    """نمط النتيجة الموحدة (Result Pattern) لتسهيل معالجة العمليات والتحققات بدون إلقاء استثناءات غير ضرورية"""
    def __init__(self, is_success: bool, value: Optional[T] = None, error: Optional[str] = None):
        self.is_success = is_success
        self._value = value
        self.error = error

    @property
    def value(self) -> T:
        if not self.is_success:
            raise ValueError(f"Cannot access value of a failed result. Error: {self.error}")
        return self._value

    @classmethod
    def success(cls, value: Optional[T] = None) -> 'Result[T]':
        return cls(is_success=True, value=value)

    @classmethod
    def fail(cls, error: str) -> 'Result[T]':
        return cls(is_success=False, error=error)


class EntityId:
    """معرف فريد للكيان"""
    def __init__(self, value: Optional[uuid.UUID] = None):
        self.value = value or uuid.uuid4()

    def __eq__(self, other):
        if not isinstance(other, EntityId):
            return False
        return self.value == other.value

    def __hash__(self):
        return hash(self.value)

    def __str__(self):
        return str(self.value)


class BaseEntity:
    """الكيان الأساسي في نطاق العمل التجاري (Domain Entity)"""
    def __init__(self, id: Optional[EntityId] = None):
        self.id = id or EntityId()

    def __eq__(self, other):
        if not isinstance(other, BaseEntity):
            return False
        return self.id == other.id

    def __hash__(self):
        return hash(self.id)


class DomainEvent:
    """حدث نطاق أساسي مشترك"""
    def __init__(self):
        self.occurred_on = uuid.uuid4() # رمز فريد للحدث أو تاريخ حدوثه


class AggregateRoot(BaseEntity):
    """جذر التجميع (Aggregate Root) في نطاق العمل التجاري للتحكم في الكيانات التابعة"""
    def __init__(self, id: Optional[EntityId] = None):
        super().__init__(id)
        self._domain_events: List[DomainEvent] = []

    def add_domain_event(self, event: DomainEvent):
        self._domain_events.append(event)

    def clear_domain_events(self):
        self._domain_events.clear()

    def get_domain_events(self) -> List[DomainEvent]:
        return self._domain_events


class ValueObject:
    """كائن القيمة (Value Object) الذي يتميز بخصائصه وقيمه وليس بمعرفه الفريد"""
    def __eq__(self, other):
        if not isinstance(other, ValueObject):
            return False
        return self.__dict__ == other.__dict__

    def __hash__(self):
        return hash(tuple(sorted(self.__dict__.items())))


class Specification(Generic[T]):
    """نمط التخصيص والتحقق من الشروط المعقدة (Specification Pattern)"""
    def __init__(self, is_satisfied_by: Callable[[T], bool]):
        self._is_satisfied_by = is_satisfied_by

    def is_satisfied_by(self, candidate: T) -> bool:
        return self._is_satisfied_by(candidate)

    def and_spec(self, other: 'Specification[T]') -> 'Specification[T]':
        return Specification(lambda x: self.is_satisfied_by(x) and other.is_satisfied_by(x))

    def or_spec(self, other: 'Specification[T]') -> 'Specification[T]':
        return Specification(lambda x: self.is_satisfied_by(x) or other.is_satisfied_by(x))