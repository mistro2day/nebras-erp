import uuid

from rest_framework import status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError

from apps.common.responses import StandardResponse
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.library.domain.models import (
    LibraryBranch, LibrarySection, Shelf, Book, BookCopy, BookEdition,
    BookAuthor, Publisher, Category, Language, ISBN, BorrowTransaction,
    Reservation, Renewal, Fine, LostBook, DamagedBook, DigitalResource,
    MediaResource, Subscription, LearningResource, ResourceAttachment,
    ReadingHistory, ReadingRecommendation, InventoryLink, LibrarySettings,
    LibraryStatistics, LibraryAudit
)
from apps.library.interfaces.serializers import (
    LibraryBranchSerializer, LibrarySectionSerializer, ShelfSerializer,
    BookAuthorSerializer, PublisherSerializer, CategorySerializer,
    LanguageSerializer, BookSerializer, BookEditionSerializer, ISBNSerializer,
    BookCopySerializer, BorrowTransactionSerializer, ReservationSerializer,
    RenewalSerializer, FineSerializer, LostBookSerializer, DamagedBookSerializer,
    DigitalResourceSerializer, MediaResourceSerializer, SubscriptionSerializer,
    LearningResourceSerializer, ResourceAttachmentSerializer, ReadingHistorySerializer,
    ReadingRecommendationSerializer, InventoryLinkSerializer, LibrarySettingsSerializer,
    LibraryStatisticsSerializer, LibraryAuditSerializer
)
from apps.library.application.services import BorrowService, FineService


class LibraryBranchViewSet(BaseCRUDViewSet):
    model_class = LibraryBranch
    serializer_class = LibraryBranchSerializer


class LibrarySectionViewSet(BaseCRUDViewSet):
    model_class = LibrarySection
    serializer_class = LibrarySectionSerializer


class ShelfViewSet(BaseCRUDViewSet):
    model_class = Shelf
    serializer_class = ShelfSerializer


class BookAuthorViewSet(BaseCRUDViewSet):
    model_class = BookAuthor
    serializer_class = BookAuthorSerializer


class PublisherViewSet(BaseCRUDViewSet):
    model_class = Publisher
    serializer_class = PublisherSerializer


class CategoryViewSet(BaseCRUDViewSet):
    model_class = Category
    serializer_class = CategorySerializer


class LanguageViewSet(BaseCRUDViewSet):
    model_class = Language
    serializer_class = LanguageSerializer


class BookViewSet(BaseCRUDViewSet):
    model_class = Book
    serializer_class = BookSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title_ar', 'title_en']

    @action(detail=False, methods=['get'], url_path='dashboard-stats')
    def get_dashboard_stats(self, request):
        """جلب إحصائيات لوحة تحكم المكتبة."""
        tenant_id = request.tenant_id
        
        total_books = Book.objects.filter(tenant_id=tenant_id).count()
        total_copies = BookCopy.objects.filter(tenant_id=tenant_id).count()
        borrowed_copies = BookCopy.objects.filter(tenant_id=tenant_id, status='borrowed').count()
        digital_resources = DigitalResource.objects.filter(tenant_id=tenant_id).count()

        stats_record = LibraryStatistics.objects.filter(tenant_id=tenant_id).first()
        fines_sum = stats_record.unpaid_fines_sum if stats_record else 0.0

        stats = {
            'total_books': total_books,
            'total_copies': total_copies,
            'borrowed_copies': borrowed_copies,
            'digital_resources': digital_resources,
            'unpaid_fines': float(fines_sum),
            'pending_reservations': Reservation.objects.filter(tenant_id=tenant_id, status='pending').count()
        }
        return Response(stats, status=status.HTTP_200_OK)


class BookEditionViewSet(BaseCRUDViewSet):
    model_class = BookEdition
    serializer_class = BookEditionSerializer


class ISBNViewSet(BaseCRUDViewSet):
    model_class = ISBN
    serializer_class = ISBNSerializer


class BookCopyViewSet(BaseCRUDViewSet):
    model_class = BookCopy
    serializer_class = BookCopySerializer

    @action(detail=True, methods=['post'], url_path='borrow')
    def borrow(self, request, pk=None):
        tenant_id = request.tenant_id
        borrower_user_id_str = request.data.get('borrower_user_id')
        loan_period_days = request.data.get('loan_period_days', 14)

        if not borrower_user_id_str:
            return Response({'error': 'يجب تحديد المستعير.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            borrower_user_id = uuid.UUID(str(borrower_user_id_str))
        except (ValueError, AttributeError, TypeError):
            return Response({'error': 'معرّف المستعير غير صالح.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tx = BorrowService.borrow_book(
                tenant_id=tenant_id,
                copy_id=pk,
                borrower_user_id=borrower_user_id,
                loan_period_days=int(loan_period_days or 14),
                user_id=request.user.id if request.user else None
            )
        except DjangoValidationError as exc:
            return Response({'error': '، '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        # نوع المستعير يُحفظ بعد الإنشاء ليُقرأ منه الاسم لاحقاً من السجل الصحيح
        borrower_type = request.data.get('borrower_type')
        if borrower_type in ('student', 'employee'):
            tx.borrower_type = borrower_type
            tx.save(update_fields=['borrower_type'])

        serializer = BorrowTransactionSerializer(tx)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BorrowTransactionViewSet(BaseCRUDViewSet):
    model_class = BorrowTransaction
    serializer_class = BorrowTransactionSerializer

    @action(detail=False, methods=['get'], url_path='people')
    def people(self, request):
        """الطلاب والموظفون في قائمة واحدة — من يحقّ له الاستعارة.

        تُجمع هنا لتفادي اعتماد شاشة المكتبة على صلاحيات موديولَي الطلاب
        وشؤون الموظفين، ولتُعرض الأسماء بدل المعرّفات الخام.
        """
        from apps.shared.application.people import list_people
        return StandardResponse(
            list_people(request.tenant_id),
            message="الطلاب والموظفون المتاحون للاستعارة.",
        )

    @action(detail=True, methods=['post'], url_path='return')
    def return_book(self, request, pk=None):
        tenant_id = request.tenant_id
        actual_return_date_str = request.data.get('actual_return_date')
        debit_gl_account_id = request.data.get('debit_gl_account_id')
        credit_gl_account_id = request.data.get('credit_gl_account_id')

        if not actual_return_date_str:
            return Response({'error': 'actual_return_date is required'}, status=status.HTTP_400_BAD_REQUEST)

        actual_return_date = timezone.datetime.strptime(actual_return_date_str, '%Y-%m-%d').date()

        tx = BorrowService.return_book(
            tenant_id=tenant_id,
            borrow_transaction_id=pk,
            actual_return_date=actual_return_date,
            debit_gl_account_id=debit_gl_account_id,
            credit_gl_account_id=credit_gl_account_id,
            user_id=request.user.id if request.user else None
        )
        serializer = self.get_serializer(tx)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ReservationViewSet(BaseCRUDViewSet):
    model_class = Reservation
    serializer_class = ReservationSerializer


class RenewalViewSet(BaseCRUDViewSet):
    model_class = Renewal
    serializer_class = RenewalSerializer


class FineViewSet(BaseCRUDViewSet):
    model_class = Fine
    serializer_class = FineSerializer


class LostBookViewSet(BaseCRUDViewSet):
    model_class = LostBook
    serializer_class = LostBookSerializer


class DamagedBookViewSet(BaseCRUDViewSet):
    model_class = DamagedBook
    serializer_class = DamagedBookSerializer


class DigitalResourceViewSet(BaseCRUDViewSet):
    model_class = DigitalResource
    serializer_class = DigitalResourceSerializer


class MediaResourceViewSet(BaseCRUDViewSet):
    model_class = MediaResource
    serializer_class = MediaResourceSerializer


class SubscriptionViewSet(BaseCRUDViewSet):
    model_class = Subscription
    serializer_class = SubscriptionSerializer


class LearningResourceViewSet(BaseCRUDViewSet):
    model_class = LearningResource
    serializer_class = LearningResourceSerializer


class ResourceAttachmentViewSet(BaseCRUDViewSet):
    model_class = ResourceAttachment
    serializer_class = ResourceAttachmentSerializer


class ReadingHistoryViewSet(BaseCRUDViewSet):
    model_class = ReadingHistory
    serializer_class = ReadingHistorySerializer


class ReadingRecommendationViewSet(BaseCRUDViewSet):
    model_class = ReadingRecommendation
    serializer_class = ReadingRecommendationSerializer


class InventoryLinkViewSet(BaseCRUDViewSet):
    model_class = InventoryLink
    serializer_class = InventoryLinkSerializer


class LibrarySettingsViewSet(BaseCRUDViewSet):
    model_class = LibrarySettings
    serializer_class = LibrarySettingsSerializer


class LibraryStatisticsViewSet(BaseCRUDViewSet):
    model_class = LibraryStatistics
    serializer_class = LibraryStatisticsSerializer


class LibraryAuditViewSet(BaseCRUDViewSet):
    model_class = LibraryAudit
    serializer_class = LibraryAuditSerializer
