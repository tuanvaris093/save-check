"""Compare original fields in two local SQL exports without emitting user data."""
import argparse
import base64
import hashlib
import json
import sqlite3
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('before', type=Path)
parser.add_argument('after', type=Path)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()

def restore(path):
    db = sqlite3.connect(':memory:')
    db.executescript(path.read_text())
    return db

before, after = restore(args.before), restore(args.after)
report = {'original_fields_unchanged': True, 'tables': {}, 'legacy_files': 0}
for (name,) in before.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name!='d1_migrations'"):
    columns = [r[1] for r in before.execute(f'PRAGMA table_info("{name}")')]
    fields = ','.join('"'+c+'"' for c in columns)
    old = before.execute(f'SELECT {fields} FROM "{name}" ORDER BY id').fetchall()
    current = after.execute(f'SELECT {fields} FROM "{name}" ORDER BY id').fetchall()
    current_by_id = {row[0]: row for row in current}
    for row in old:
        assert current_by_id.get(row[0]) == row, f'Original data differs in {name}'
    report['tables'][name] = {'before': len(old), 'after': len(current), 'original_rows_preserved': len(old)}
for row_id, data in before.execute('SELECT id,layout_file_data FROM submissions WHERE layout_file_data IS NOT NULL'):
    copied = after.execute('SELECT file_data FROM legacy_layout_snapshots WHERE revision_id=?', ('legacy-revision-'+str(row_id),)).fetchone()
    assert copied and copied[0] == data, 'Legacy attachment snapshot differs'
    if not data.startswith(('http:', 'https:')):
        raw = data.split(',', 1)[1] if data.startswith('data:') else data
        assert len(base64.b64decode(raw)) > 0, 'Legacy attachment is empty'
    report['legacy_files'] += 1
assert not after.execute('PRAGMA foreign_key_check').fetchall(), 'Foreign key violations'
assert after.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
report['migration_ledger'] = [r[0] for r in after.execute('SELECT name FROM d1_migrations ORDER BY name')]
assert len(report['migration_ledger']) == len(list(Path('worker/src/db/migrations').glob('*.sql')))
report['foreign_key_violations'] = 0
report['backup_sha256'] = hashlib.sha256(args.before.read_bytes()).hexdigest()
report['after_sha256'] = hashlib.sha256(args.after.read_bytes()).hexdigest()
args.output.write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
