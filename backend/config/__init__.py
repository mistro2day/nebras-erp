"""
Config package init.

Exposes the Celery app so it is loaded when Django starts (standard Celery layout).
Guarded so the project still imports if Celery is unavailable in a given tool run.
"""
try:
    from config.celery import app as celery_app
    __all__ = ('celery_app',)
except Exception:  # noqa: BLE001 - Celery optional at import time (e.g. some mgmt tools)
    celery_app = None
    __all__ = ()
