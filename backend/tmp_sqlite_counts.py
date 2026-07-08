import sqlite3
con = sqlite3.connect('db.sqlite3')
cur = con.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [r[0] for r in cur.fetchall()]
print('total tables:', len(tables))
total = 0
for t in tables:
    try:
        cur.execute(f'SELECT COUNT(*) FROM "{t}"')
        c = cur.fetchone()[0]
        total += c
        if c:
            print(f'{t}: {c}')
    except Exception as e:
        print(t, 'ERR', e)
print('total rows (non-empty):', total)
