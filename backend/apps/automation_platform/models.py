"""
Root models module.

Re-exports all domain models so Django's app loader discovers and registers them
(matching the established Nebras pattern, e.g. ``apps.platform.models``). Business
logic and model definitions live under ``domain/models/`` — this file is only the
registration surface.
"""
from apps.automation_platform.domain.models import *  # noqa: F401,F403
from apps.automation_platform.domain.models import __all__  # noqa: F401
