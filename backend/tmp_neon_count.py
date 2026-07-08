import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neon_transfer_settings')
django.setup()
from django.db import connection
with connection.cursor() as cur:
    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
    tables = [r[0] for r in cur.fetchall()]
total = 0
nonempty = 0
for t in tables:
    try:
        cur.execute(f'SELECT COUNT(*) FROM "{t}"')
        c = cur.fetchone()[0]
    except Exception:
        c = -1
    total += max(c, 0)
    if c and c > 0:
        nonempty += 1
print('tables:', len(tables), 'non-empty tables:', nonempty, 'total rows:', total)
