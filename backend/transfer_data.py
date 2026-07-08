import os
import sys
import django
from io import StringIO
from collections import defaultdict, deque

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "neon_transfer_settings")
django.setup()

from django.apps import apps
from django.db import connection
from django.db.models import ForeignKey, OneToOneField
from django.core import serializers
from django.db.utils import IntegrityError

LEGACY = "legacy"
DEFAULT = "default"
FIXTURE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_dump.json")

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
print(f"Truncating {len(all_tables)} tables...")
with connection.cursor() as cur:
    cur.execute(
        "TRUNCATE TABLE {} RESTART IDENTITY CASCADE".format(
            ", ".join('"%s"' % t for t in all_tables)
        )
    )

# --- dependency order (parents before children) ---
indeg = {m: 0 for m in models}
adj = defaultdict(list)
for m in models:
    for f in m._meta.get_fields():
        if isinstance(f, (ForeignKey, OneToOneField)):
            rel = f.related_model
            if rel in model_set and rel is not m:
                adj[rel].append(m)
                indeg[m] += 1
q = deque([m for m in models if indeg[m] == 0])
ordered = []
while q:
    m = q.popleft()
    ordered.append(m)
    for child in adj[m]:
        indeg[child] -= 1
        if indeg[child] == 0:
            q.appendleft(child)
for m in models:  # append any left (cycles)
    if m not in ordered:
        ordered.append(m)

# --- collect instances from legacy, in order ---
instances = []
counts = {}
for m in ordered:
    objs = list(m.objects.using(LEGACY).all())
    instances.extend(objs)
    counts[m._meta.label] = len(objs)
total = sum(counts.values())
print(f"Collected {total} objects from {len(models)} models.")

# --- serialize (utf-8) ---
data = serializers.serialize("json", instances, use_natural_foreign_keys=False)
with open(FIXTURE, "w", encoding="utf-8") as fh:
    fh.write(data)
print(f"Wrote fixture to {FIXTURE}")

# --- deserialize + save into Neon ---
with open(FIXTURE, "r", encoding="utf-8") as fh:
    objs = list(serializers.deserialize("json", fh))

pending = list(objs)
saved = 0
retries = 0
while pending:
    still = []
    progressed = False
    for dobj in pending:
        try:
            dobj.object.save(using=DEFAULT)
            saved += 1
            progressed = True
        except IntegrityError:
            still.append(dobj)
    if not progressed:
        # remaining failures: surface one to avoid infinite loop
        retries += 1
        if retries > 1:
            print("UNRESOLVED FK errors:", len(still))
            for dobj in still[:5]:
                print("  ", dobj.object._meta.label, dobj.object.pk)
            break
    pending = still

print(f"Saved {saved} objects into Neon.")

# --- reset sequences ---
labels = [cfg.label for cfg in apps.get_app_configs() if cfg.models_module]
out = StringIO()
from django.core.management import call_command
call_command("sqlsequencereset", *labels, stdout=out)
sql = out.getvalue()
if sql.strip():
    with connection.cursor() as cur:
        for stmt in sql.split(";"):
            s = stmt.strip()
            if s:
                cur.execute(s)
    print("Sequences reset.")

print("DONE")
