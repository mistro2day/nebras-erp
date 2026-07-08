from config.settings import *  # noqa: F401,F403

import os

_base = os.path.dirname(os.path.abspath(__file__))
DATABASES["legacy"] = {
    "ENGINE": "django.db.backends.sqlite3",
    "NAME": os.path.join(_base, "db.sqlite3"),
}
