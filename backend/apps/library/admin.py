from django.contrib import admin
from apps.library.domain.models import (
    LibraryBranch, LibrarySection, Shelf, Book, BookCopy, BookEdition,
    BookAuthor, Publisher, Category, Language, ISBN, BorrowTransaction,
    Reservation, Renewal, Fine, LostBook, DamagedBook, DigitalResource,
    Subscription, LibrarySettings
)

@admin.register(LibraryBranch)
class LibraryBranchAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'name_en', 'tenant_id')
    search_fields = ('code', 'name_ar')

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title_ar', 'title_en', 'category', 'language', 'publisher')
    list_filter = ('category', 'language')
    search_fields = ('title_ar', 'title_en')

@admin.register(BookCopy)
class BookCopyAdmin(admin.ModelAdmin):
    list_display = ('book', 'barcode', 'shelf', 'status')
    list_filter = ('status',)
    search_fields = ('barcode',)

@admin.register(BorrowTransaction)
class BorrowTransactionAdmin(admin.ModelAdmin):
    list_display = ('copy', 'borrower_user_id', 'borrow_date', 'due_date', 'status')
    list_filter = ('status', 'borrow_date')
    search_fields = ('copy__barcode', 'borrower_user_id')

@admin.register(Fine)
class FineAdmin(admin.ModelAdmin):
    list_display = ('borrow_transaction', 'fine_amount', 'days_overdue', 'status')
    list_filter = ('status',)

admin.site.register(LibrarySection)
admin.site.register(Shelf)
admin.site.register(BookEdition)
admin.site.register(BookAuthor)
admin.site.register(Publisher)
admin.site.register(Category)
admin.site.register(Language)
admin.site.register(ISBN)
admin.site.register(Reservation)
admin.site.register(Renewal)
admin.site.register(LostBook)
admin.site.register(DamagedBook)
admin.site.register(DigitalResource)
admin.site.register(Subscription)
admin.site.register(LibrarySettings)
