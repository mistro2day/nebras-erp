import logging
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.common.responses import StandardResponse
from apps.ai.domain.models import AIConversation
from apps.ai.interfaces.serializers import AIConversationSerializer, AIAskPromptSerializer
from apps.reporting.application import nlq_service as NLQService
from apps.reporting.application.nlq_service import NLQUnavailable

logger = logging.getLogger('nebras.ai')


class AIConversationViewSet(BaseCRUDViewSet):
    model_class = AIConversation
    serializer_class = AIConversationSerializer

    def get_queryset(self):
        # عزل صارم: بلا مستأجر محدَّد لا نعرض شيئاً. لا الرجوع إلى first()
        # ولا objects.all() — كلاهما يكشف محادثات مستأجرين آخرين.
        tenant_id = None
        if hasattr(self.request, 'tenant') and self.request.tenant:
            tenant_id = self.request.tenant.id
        elif getattr(self.request.user, 'tenant_id', None):
            tenant_id = self.request.user.tenant_id

        if tenant_id is None:
            return AIConversation.objects.none()
        return AIConversation.objects.filter(tenant_id=tenant_id).order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='ask')
    def ask_prompt(self, request):
        """
        طرح سؤال أو إدخال برومبت لمساعد نبراس الذكي.

        يقوم بتحليل السؤال عبر محرك الذكاء الاصطناعي والمقاييس،
        ويسجّل المحادثة في قاعدة البيانات حتمياً مع عزل المستأجر.
        """
        serializer = AIAskPromptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # عزل المستأجر: نأخذ المعرّف من الطلب المصادَق فقط. الرجوع إلى
        # Tenant.objects.first() ثغرة تسريب — يجعل طلباً غير مصادَق أو خاطئ
        # الإعداد يرى بيانات أول مدرسة في القاعدة. نرفض بدل أن نخمّن.
        tenant_id = None
        if hasattr(request, 'tenant') and request.tenant:
            tenant_id = request.tenant.id
        elif getattr(request.user, 'tenant_id', None):
            tenant_id = request.user.tenant_id

        if tenant_id is None:
            return StandardResponse(
                data={'answered': False, 'answer': 'تعذّر تحديد المؤسسة لهذا الطلب.'},
                message="تعذّر تحديد المستأجر لهذا الطلب.",
                success=False,
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_id = getattr(request.user, 'id', None)
        prompt = serializer.validated_data['prompt']

        try:
            nlq_res = NLQService.ask(
                question=prompt,
                tenant_id=tenant_id,
                user_id=user_id,
            )
            return StandardResponse(
                data=nlq_res,
                message="تمت معالجة الاستفسار بواسطة مساعد نبراس بنجاح.",
                success=True,
            )
        except NLQUnavailable as exc:
            return StandardResponse(
                data={
                    'answered': False,
                    'answer': str(exc),
                },
                message=str(exc),
                success=False,
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            logger.exception("فشل في معالجة طلب مساعد نبراس الذكي")
            return StandardResponse(
                data={
                    'answered': False,
                    'answer': 'تعذّر معالجة الطلب حالياً. يرجى المحاولة لاحقاً.',
                },
                message="خطأ في معالجة الذكاء الاصطناعي",
                success=False,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['post'], url_path='clear-history')
    def clear_history(self, request):
        """حذف سجل محادثات الذكاء الاصطناعي الخاصة بالمستأجر الحالي."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        if tenant_id:
            AIConversation.objects.filter(tenant_id=tenant_id).delete()
        return StandardResponse(data=None, message="تم مسح سجل محادثات الذكاء الاصطناعي بنجاح.")
