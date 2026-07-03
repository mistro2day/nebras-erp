from django.contrib import admin
from apps.communications.domain.models import (
    CommunicationChannel, CommunicationProvider, CommunicationTemplate,
    CommunicationTemplateVersion, CommunicationVariable, CommunicationMessage,
    CommunicationRecipient, CommunicationAttachment, CommunicationQueue,
    CommunicationLog, CommunicationPreference, CommunicationCampaign,
    CommunicationEvent, CommunicationWebhook, CommunicationStatistics,
    CommunicationFailure, CommunicationRetry, Notification
)

# خريطة ترجمة الأسماء
translations = {
    CommunicationChannel: ('قناة اتصال', '1. قنوات الاتصال'),
    CommunicationProvider: ('مزود خدمة', '2. مزودي الخدمة'),
    CommunicationTemplate: ('قالب رسالة', '3. قوالب الرسائل'),
    CommunicationTemplateVersion: ('إصدار قالب', '4. إصدارات القوالب'),
    CommunicationVariable: ('متغير ديناميكي', '5. المتغيرات الديناميكية'),
    CommunicationMessage: ('رسالة اتصال', '6. سجل الرسائل'),
    CommunicationRecipient: ('مستلم الرسالة', '7. مستلمي الرسائل'),
    CommunicationAttachment: ('مرفق الرسالة', '8. المرفقات'),
    CommunicationQueue: ('طابور إرسال', '9. طابور الرسائل'),
    CommunicationLog: ('سجل عملية', '10. سجل العمليات والتدقيق'),
    CommunicationPreference: ('تفضيلات الاتصال', '11. تفضيلات المستخدمين'),
    CommunicationCampaign: ('حملة اتصالات', '12. حملات الاتصال'),
    CommunicationEvent: ('حدث نظام', '13. أحداث النظام والربط'),
    CommunicationWebhook: ('ويب هوك صادر/وارد', '14. إعدادات الـ Webhooks'),
    CommunicationStatistics: ('إحصائية أداء', '15. تقارير أداء الاتصال'),
    CommunicationFailure: ('حالة فشل إرسال', '16. سجل حالات الفشل والأخطاء'),
    CommunicationRetry: ('محاولة إعادة إرسال', '17. سجل إعادة المحاولات'),
    Notification: ('إشعار مستخدم', '18. الإشعارات الداخلية للتطبيق'),
}

for model, (verbose_name, verbose_name_plural) in translations.items():
    model._meta.verbose_name = verbose_name
    model._meta.verbose_name_plural = verbose_name_plural

admin.site.register(CommunicationChannel)
admin.site.register(CommunicationProvider)
admin.site.register(CommunicationTemplate)
admin.site.register(CommunicationTemplateVersion)
admin.site.register(CommunicationVariable)
admin.site.register(CommunicationMessage)
admin.site.register(CommunicationRecipient)
admin.site.register(CommunicationAttachment)
admin.site.register(CommunicationQueue)
admin.site.register(CommunicationLog)
admin.site.register(CommunicationPreference)
admin.site.register(CommunicationCampaign)
admin.site.register(CommunicationEvent)
admin.site.register(CommunicationWebhook)
admin.site.register(CommunicationStatistics)
admin.site.register(CommunicationFailure)
admin.site.register(CommunicationRetry)
admin.site.register(Notification)
