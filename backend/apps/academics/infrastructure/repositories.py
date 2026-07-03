from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from apps.academics.domain.models import AcademicYear, Term, Stage, Grade, Section

class IAcademicYearRepository(ABC):
    @abstractmethod
    def get_by_id(self, year_id: UUID) -> Optional[AcademicYear]:
        pass

    @abstractmethod
    def get_current_year(self, tenant_id: UUID) -> Optional[AcademicYear]:
        pass

    @abstractmethod
    def save(self, year: AcademicYear) -> AcademicYear:
        pass


class DjangoAcademicYearRepository(IAcademicYearRepository):
    def get_by_id(self, year_id: UUID) -> Optional[AcademicYear]:
        try:
            return AcademicYear.objects.get(id=year_id, deleted_at__isnull=True)
        except AcademicYear.DoesNotExist:
            return None

    def get_current_year(self, tenant_id: UUID) -> Optional[AcademicYear]:
        try:
            return AcademicYear.objects.get(tenant_id=tenant_id, current_flag=True, deleted_at__isnull=True)
        except AcademicYear.DoesNotExist:
            return None

    def save(self, year: AcademicYear) -> AcademicYear:
        year.save()
        return year