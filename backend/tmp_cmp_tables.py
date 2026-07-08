import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.db import connection
with connection.cursor() as cur:
    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
    pg = set(r[0] for r in cur.fetchall())
import sqlite3
con = sqlite3.connect('db.sqlite3')
c = con.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
sq = set(r[0] for r in c.fetchall())
print('pg tables:', len(pg), 'sqlite tables:', len(sq))
print('IN SQLITE NOT IN PG:')
for t in sorted(sq - pg):
    print('  ', t)
print('IN PG NOT IN SQLITE:')
for t in sorted(pg - sq):
    print('  ', t)
