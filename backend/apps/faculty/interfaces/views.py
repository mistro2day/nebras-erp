from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from apps.common.responses import StandardResponse
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.faculty.domain.models import FacultyMember, TeacherProfile, AcademicQualification, TeachingLicense, TeacherAssignment, TeacherAvailability
from apps.faculty.interfaces.serializers import (
    FacultyMemberSerializer, TeacherProfileSerializer, AcademicQualificationSerializer,
    TeachingLicenseSerializer, TeacherAssignmentSerializer, TeacherAvailabilitySerializer
)

class FacultyMemberViewSet(BaseCRUDViewSet):
    model_class = FacultyMember
    serializer_class = FacultyMemberSerializer

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        instance = self.get_object()
        instance.status = 'approved'
        instance.save()
        return StandardResponse(self.get_serializer(instance).data, message="تمت الموافقة على تعيين عضو هيئة التدريس بنجاح.")

class TeacherProfileViewSet(BaseCRUDViewSet):
    model_class = TeacherProfile
    serializer_class = TeacherProfileSerializer

class AcademicQualificationViewSet(BaseCRUDViewSet):
    model_class = AcademicQualification
    serializer_class = AcademicQualificationSerializer

class TeachingLicenseViewSet(BaseCRUDViewSet):
    model_class = TeachingLicense
    serializer_class = TeachingLicenseSerializer

class TeacherAssignmentViewSet(BaseCRUDViewSet):
    model_class = TeacherAssignment
    serializer_class = TeacherAssignmentSerializer

class TeacherAvailabilityViewSet(BaseCRUDViewSet):
    model_class = TeacherAvailability
    serializer_class = TeacherAvailabilitySerializer