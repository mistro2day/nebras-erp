from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.faculty.interfaces.views import (
    FacultyMemberViewSet, TeacherProfileViewSet, AcademicQualificationViewSet,
    TeachingLicenseViewSet, TeacherAssignmentViewSet, TeacherAvailabilityViewSet
)

router = DefaultRouter()
router.register(r'members', FacultyMemberViewSet, basename='faculty-member')
router.register(r'profiles', TeacherProfileViewSet, basename='faculty-profile')
router.register(r'qualifications', AcademicQualificationViewSet, basename='faculty-qualification')
router.register(r'licenses', TeachingLicenseViewSet, basename='faculty-license')
router.register(r'assignments', TeacherAssignmentViewSet, basename='faculty-assignment')
router.register(r'availabilities', TeacherAvailabilityViewSet, basename='faculty-availability')

urlpatterns = [
    path('', include(router.urls)),
]