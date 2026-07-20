from rest_framework import serializers
from apps.library.domain.models import (
    LibraryBranch, LibrarySection, Shelf, Book, BookCopy, BookEdition,
    BookAuthor, Publisher, Category, Language, ISBN, BorrowTransaction,
    Reservation, Renewal, Fine, LostBook, DamagedBook, DigitalResource,
    MediaResource, Subscription, LearningResource, ResourceAttachment,
    ReadingHistory, ReadingRecommendation, InventoryLink, LibrarySettings,
    LibraryStatistics, LibraryAudit
)

class BaseLibrarySerializer(serializers.ModelSerializer):
    class Meta:
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')

class LibraryBranchSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = LibraryBranch
        fields = '__all__'

class LibrarySectionSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = LibrarySection
        fields = '__all__'

class ShelfSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = Shelf
        fields = '__all__'

class BookAuthorSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = BookAuthor
        fields = '__all__'

class PublisherSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = Publisher
        fields = '__all__'

class CategorySerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = Category
        fields = '__all__'

class LanguageSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = Language
        fields = '__all__'

class BookSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = Book
        fields = '__all__'

class BookEditionSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = BookEdition
        fields = '__all__'

class ISBNSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = ISBN
        fields = '__all__'

class BookCopySerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = BookCopy
        fields = '__all__'

class BorrowTransactionSerializer(BaseLibrarySerializer):
    # اسم المستعير وعنوان الكتاب يُرفقان مع كل سطر — بدونهما تعرض الشاشة
    # معرّفات خاماً، وتضطر لاستدعاء منفصل لكل صف.
    borrower_name = serializers.SerializerMethodField()
    book_title = serializers.SerializerMethodField()
    barcode = serializers.CharField(source='copy.barcode', read_only=True)

    class Meta(BaseLibrarySerializer.Meta):
        model = BorrowTransaction
        fields = '__all__'

    def get_borrower_name(self, obj):
        from apps.shared.application.people import resolve_person
        index = self.context.get('people_index')
        if index is None:
            from apps.shared.application.people import build_people_index
            index = build_people_index(obj.tenant_id)
            self.context['people_index'] = index
        return resolve_person(index, obj.borrower_type, obj.borrower_user_id)['name']

    def get_book_title(self, obj):
        book = getattr(getattr(obj, 'copy', None), 'book', None)
        return getattr(book, 'title_ar', None) or getattr(book, 'title_en', None) or '—'

class ReservationSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = Reservation
        fields = '__all__'

class RenewalSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = Renewal
        fields = '__all__'

class FineSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = Fine
        fields = '__all__'

class LostBookSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = LostBook
        fields = '__all__'

class DamagedBookSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = DamagedBook
        fields = '__all__'

class DigitalResourceSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = DigitalResource
        fields = '__all__'

class MediaResourceSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = MediaResource
        fields = '__all__'

class SubscriptionSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = Subscription
        fields = '__all__'

class LearningResourceSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = LearningResource
        fields = '__all__'

class ResourceAttachmentSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = ResourceAttachment
        fields = '__all__'

class ReadingHistorySerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = ReadingHistory
        fields = '__all__'

class ReadingRecommendationSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = ReadingRecommendation
        fields = '__all__'

class InventoryLinkSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = InventoryLink
        fields = '__all__'

class LibrarySettingsSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = LibrarySettings
        fields = '__all__'

class LibraryStatisticsSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = LibraryStatistics
        fields = '__all__'

class LibraryAuditSerializer(BaseLibrarySerializer):
    class Meta(BaseLibrarySerializer.Meta):
        model = LibraryAudit
        fields = '__all__'
