import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "neon_transfer_settings")
django.setup()

from django.apps import apps
from django.db import connection
from django.db.models import ForeignKey, OneToOneField, ManyToManyField
from django.core.management import call_command

LEGACY = "legacy"
DEFAULT = "default"
LOGPATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "transfer_log.txt")
FIXTURE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_dump.json")

logf = open(LOGPATH, "w", encoding="utf-8", buffering=1)


def L(msg):
    print(msg, file=logf, flush=True)


models = [
    m
    for m in apps.get_models()
    if not m._meta.abstract and m._meta.managed and not m._meta.proxy
]
model_set = set(models)

# --- truncate Neon for a clean slate ---
with connection.cursor() as cur:
    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")
    all_tables = [r[0] for r in cur.fetchall()]
L(f"Truncating {len(all_tables)} tables...")
with connection.cursor() as cur:
    cur.execute(
        "TRUNCATE TABLE {} RESTART IDENTITY CASCADE".format(
            ", ".join('"%s"' % t for t in all_tables)
        )
    )
L("Truncated.")

# --- dependency order (parents before children) ---
indeg = {m: 0 for m in models}
adj = {m: [] for m in models}
for m in models:
    for f in m._meta.get_fields():
        if isinstance(f, (ForeignKey, OneToOneField)):
            rel = f.related_model
            if rel in model_set and rel is not m:
                adj[rel].append(m)
                indeg[m] += 1
from collections import deque

q = deque([m for m in models if indeg[m] == 0])
ordered = []
while q:
    m = q.popleft()
    ordered.append(m)
    for child in adj[m]:
        indeg[child] -= 1
        if indeg[child] == 0:
            q.appendleft(child)
for m in models:
    if m not in ordered:
        ordered.append(m)

# --- copy main tables via bulk_create (preserves PKs) ---
total = 0
for m in ordered:
    objs = list(m.objects.using(LEGACY).all())
    if not objs:
        continue
    m.objects.using(DEFAULT).bulk_create(objs, batch_size=200)
    total += len(objs)
    L(f"[main] {m._meta.label}: {len(objs)}")

# --- copy implicit M2M through tables ---
m2m_done = 0
for m in models:
    for f in m._meta.get_fields():
        if isinstance(f, ManyToManyField) and f.m2m_db_table():
            through = f.through
            if through in model_set:
                continue  # already copied as a normal model
            rows = list(through.objects.using(LEGACY).all())
            if rows:
                through.objects.using(DEFAULT).bulk_create(rows, batch_size=200)
                m2m_done += len(rows)
                L(f"[m2m] {through._meta.label}: {len(rows)}")

L(f"Copied {total} main rows and {m2m_done} m2m rows.")

# --- reset sequences ---
labels = [cfg.label for cfg in apps.get_app_configs() if cfg.models_module]
from io import StringIO

out = StringIO()
call_command("sqlsequencereset", *labels, stdout=out)
sql = out.getvalue()
if sql.strip():
    with connection.cursor() as cur:
        for stmt in sql.split(";"):
            s = stmt.strip()
            if s:
                cur.execute(s)
    L("Sequences reset.")

L("DONE")
logf.close()
