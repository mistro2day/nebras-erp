from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.library.interfaces.views import (
    LibraryBranchViewSet, LibrarySectionViewSet, ShelfViewSet,
    BookAuthorViewSet, PublisherViewSet, CategoryViewSet,
    LanguageViewSet, BookViewSet, BookEditionViewSet, ISBNViewSet,
    BookCopyViewSet, BorrowTransactionViewSet, ReservationViewSet,
    RenewalViewSet, FineViewSet, LostBookViewSet, DamagedBookViewSet,
    DigitalResourceViewSet, MediaResourceViewSet, SubscriptionViewSet,
    LearningResourceViewSet, ResourceAttachmentViewSet, ReadingHistoryViewSet,
    ReadingRecommendationViewSet, InventoryLinkViewSet, LibrarySettingsViewSet,
    LibraryStatisticsViewSet, LibraryAuditViewSet
)

router = DefaultRouter()
router.register('branches', LibraryBranchViewSet, basename='branch')
router.register('sections', LibrarySectionViewSet, basename='section')
router.register('shelves', ShelfViewSet, basename='shelf')
router.register('authors', BookAuthorViewSet, basename='author')
router.register('publishers', PublisherViewSet, basename='publisher')
router.register('categories', CategoryViewSet, basename='category')
router.register('languages', LanguageViewSet, basename='language')
router.register('items', BookViewSet, basename='book')
router.register('editions', BookEditionViewSet, basename='edition')
router.register('isbns', ISBNViewSet, basename='isbn')
router.register('copies', BookCopyViewSet, basename='copy')
router.register('borrows', BorrowTransactionViewSet, basename='borrow')
router.register('reservations', ReservationViewSet, basename='reservation')
router.register('renewals', RenewalViewSet, basename='renewal')
router.register('fines', FineViewSet, basename='fine')
router.register('lost-books', LostBookViewSet, basename='lost-book')
router.register('damaged-books', DamagedBookViewSet, basename='damaged-book')
router.register('digital-resources', DigitalResourceViewSet, basename='digital-resource')
router.register('media-resources', MediaResourceViewSet, basename='media-resource')
router.register('subscriptions', SubscriptionViewSet, basename='subscription')
router.register('learning-resources', LearningResourceViewSet, basename='learning-resource')
router.register('attachments', ResourceAttachmentViewSet, basename='attachment')
router.register('reading-histories', ReadingHistoryViewSet, basename='reading-history')
router.register('recommendations', ReadingRecommendationViewSet, basename='recommendation')
router.register('inventory-links', InventoryLinkViewSet, basename='inventory-link')
router.register('settings', LibrarySettingsViewSet, basename='settings')
router.register('statistics', LibraryStatisticsViewSet, basename='statistics')
router.register('audits', LibraryAuditViewSet, basename='audit')

urlpatterns = [
    path('', include(router.urls)),
]
