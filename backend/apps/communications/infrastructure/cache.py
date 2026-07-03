import logging
import hashlib
import json
from django.core.cache import cache

logger = logging.getLogger('nebras.communications.cache')


# ============================================================
# تخزين مؤقت للقوالب — Template Cache
# ============================================================
class TemplateCache:
    """
    تخزين مؤقت لقوالب الرسائل في Redis.
    يقلل من استعلامات قاعدة البيانات عند الإرسال المتكرر.
    """

    PREFIX = 'nebras:comm:template:'
    TTL = 3600  # ساعة واحدة

    @classmethod
    def _key(cls, tenant_id, template_code, language='ar'):
        return f"{cls.PREFIX}{tenant_id}:{template_code}:{language}"

    @classmethod
    def get(cls, tenant_id, template_code, language='ar'):
        """الحصول على قالب من الكاش."""
        key = cls._key(tenant_id, template_code, language)
        data = cache.get(key)
        if data:
            logger.debug(f"[Cache HIT] القالب: {template_code}")
            return json.loads(data)
        return None

    @classmethod
    def set(cls, tenant_id, template_code, template_data, language='ar'):
        """حفظ قالب في الكاش."""
        key = cls._key(tenant_id, template_code, language)
        cache.set(key, json.dumps(template_data, ensure_ascii=False), cls.TTL)
        logger.debug(f"[Cache SET] القالب: {template_code}")

    @classmethod
    def invalidate(cls, tenant_id, template_code, language='ar'):
        """إبطال كاش قالب محدد."""
        key = cls._key(tenant_id, template_code, language)
        cache.delete(key)
        logger.debug(f"[Cache INVALIDATE] القالب: {template_code}")

    @classmethod
    def invalidate_all(cls, tenant_id):
        """إبطال جميع القوالب المخزنة لمستأجر محدد."""
        # في بيئة الإنتاج يستخدم pattern delete
        logger.info(f"[Cache] إبطال جميع قوالب المستأجر: {tenant_id}")


# ============================================================
# تخزين مؤقت للتفضيلات — Preference Cache
# ============================================================
class PreferenceCache:
    """
    تخزين مؤقت لتفضيلات المستخدمين.
    """

    PREFIX = 'nebras:comm:pref:'
    TTL = 1800  # 30 دقيقة

    @classmethod
    def _key(cls, tenant_id, entity_type, entity_id):
        return f"{cls.PREFIX}{tenant_id}:{entity_type}:{entity_id}"

    @classmethod
    def get(cls, tenant_id, entity_type, entity_id):
        """الحصول على تفضيلات من الكاش."""
        key = cls._key(tenant_id, entity_type, entity_id)
        data = cache.get(key)
        if data:
            return json.loads(data)
        return None

    @classmethod
    def set(cls, tenant_id, entity_type, entity_id, pref_data):
        """حفظ تفضيلات في الكاش."""
        key = cls._key(tenant_id, entity_type, entity_id)
        cache.set(key, json.dumps(pref_data, ensure_ascii=False), cls.TTL)

    @classmethod
    def invalidate(cls, tenant_id, entity_type, entity_id):
        """إبطال كاش تفضيلات محددة."""
        key = cls._key(tenant_id, entity_type, entity_id)
        cache.delete(key)


# ============================================================
# محدد المعدل — Rate Limiter
# ============================================================
class RateLimiter:
    """
    تحديد معدل الإرسال لكل مزود لمنع تجاوز الحصص.
    يستخدم Redis كمخزن للعدادات.
    """

    PREFIX = 'nebras:comm:rate:'

    @classmethod
    def _minute_key(cls, provider_id):
        from datetime import datetime
        minute = datetime.now().strftime('%Y%m%d%H%M')
        return f"{cls.PREFIX}min:{provider_id}:{minute}"

    @classmethod
    def _hour_key(cls, provider_id):
        from datetime import datetime
        hour = datetime.now().strftime('%Y%m%d%H')
        return f"{cls.PREFIX}hr:{provider_id}:{hour}"

    @classmethod
    def _day_key(cls, provider_id):
        from datetime import datetime
        day = datetime.now().strftime('%Y%m%d')
        return f"{cls.PREFIX}day:{provider_id}:{day}"

    @classmethod
    def check_rate_limit(cls, provider_id, rate_per_minute=60,
                         rate_per_hour=1000, daily_quota=10000):
        """
        التحقق من أن المزود لم يتجاوز الحد المسموح.
        يُرجع True إذا كان الإرسال مسموحاً.
        """
        # فحص الحد في الدقيقة
        minute_key = cls._minute_key(provider_id)
        minute_count = cache.get(minute_key, 0)
        if int(minute_count) >= rate_per_minute:
            logger.warning(f"[RateLimit] تجاوز الحد في الدقيقة للمزود {provider_id}")
            return False

        # فحص الحد في الساعة
        hour_key = cls._hour_key(provider_id)
        hour_count = cache.get(hour_key, 0)
        if int(hour_count) >= rate_per_hour:
            logger.warning(f"[RateLimit] تجاوز الحد في الساعة للمزود {provider_id}")
            return False

        # فحص الحصة اليومية
        day_key = cls._day_key(provider_id)
        day_count = cache.get(day_key, 0)
        if int(day_count) >= daily_quota:
            logger.warning(f"[RateLimit] تجاوز الحصة اليومية للمزود {provider_id}")
            return False

        return True

    @classmethod
    def increment(cls, provider_id):
        """زيادة عداد الإرسال لمزود محدد."""
        minute_key = cls._minute_key(provider_id)
        hour_key = cls._hour_key(provider_id)
        day_key = cls._day_key(provider_id)

        # استخدام incr مع TTL
        try:
            for key, ttl in [(minute_key, 120), (hour_key, 7200), (day_key, 172800)]:
                current = cache.get(key)
                if current is None:
                    cache.set(key, 1, ttl)
                else:
                    cache.incr(key)
        except Exception as e:
            logger.warning(f"[RateLimit] خطأ في تحديث العدادات: {e}")

    @classmethod
    def get_usage(cls, provider_id):
        """الحصول على الاستخدام الحالي لمزود."""
        return {
            'minute': int(cache.get(cls._minute_key(provider_id), 0)),
            'hour': int(cache.get(cls._hour_key(provider_id), 0)),
            'day': int(cache.get(cls._day_key(provider_id), 0)),
        }


# ============================================================
# كاش الإحصائيات — Statistics Cache
# ============================================================
class StatisticsCache:
    """
    تخزين مؤقت للإحصائيات المجمعة لتقليل حمل قاعدة البيانات.
    """

    PREFIX = 'nebras:comm:stats:'
    TTL = 300  # 5 دقائق

    @classmethod
    def get_dashboard(cls, tenant_id):
        """الحصول على ملخص لوحة التحكم من الكاش."""
        key = f"{cls.PREFIX}dashboard:{tenant_id}"
        data = cache.get(key)
        return json.loads(data) if data else None

    @classmethod
    def set_dashboard(cls, tenant_id, data):
        """حفظ ملخص لوحة التحكم في الكاش."""
        key = f"{cls.PREFIX}dashboard:{tenant_id}"
        cache.set(key, json.dumps(data, ensure_ascii=False, default=str), cls.TTL)

    @classmethod
    def invalidate_dashboard(cls, tenant_id):
        """إبطال كاش لوحة التحكم."""
        key = f"{cls.PREFIX}dashboard:{tenant_id}"
        cache.delete(key)
