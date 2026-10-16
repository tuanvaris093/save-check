import json,sqlite3,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
MIGRATIONS=sorted((ROOT/'worker/src/db/migrations').glob('*.sql'))
LEGACY=['submissions','respondent_profiles','respondent_work_infos','environment_inspections','environment_measurement_points','health_risk_answers','satisfaction_answers','assessment_results']
def connection():
 c=sqlite3.connect(':memory:');c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON');return c
def apply(c,files=MIGRATIONS):
 c.execute('CREATE TABLE IF NOT EXISTS d1_migrations(id INTEGER PRIMARY KEY, name TEXT UNIQUE, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)')
 for p in files:
  if c.execute('SELECT 1 FROM d1_migrations WHERE name=?',(p.name,)).fetchone():continue
  c.executescript('BEGIN;\n'+p.read_text()+"\nINSERT INTO d1_migrations(name) VALUES ('"+p.name+"');\nCOMMIT;")
def snapshot(c):
 return {t:{'columns':[x['name'] for x in c.execute(f'PRAGMA table_info({t})')],'rows':[dict(x) for x in c.execute(f'SELECT * FROM {t} ORDER BY id')]} for t in LEGACY}
class Migrations(unittest.TestCase):
 def test_empty_install_and_ledger_resume(self):
  c=connection();apply(c);self.assertEqual(c.execute('SELECT COUNT(*) FROM program_catalog').fetchone()[0],7);apply(c);self.assertEqual(c.execute('SELECT COUNT(*) FROM d1_migrations').fetchone()[0],len(MIGRATIONS));self.assertFalse(c.execute('PRAGMA foreign_key_check').fetchall())
 def legacy_db(self):
  c=connection();c.executescript((ROOT/'worker/src/db/schema.sql').read_text());c.executescript((ROOT/'worker/src/db/seed.sql').read_text())
  c.execute("UPDATE environment_measurement_points SET measure_value=0,remark=NULL WHERE id=1")
  c.execute("UPDATE submissions SET has_layout=1,layout_file_name='legacy.png',layout_file_type='image/png',layout_file_size=3,layout_file_data='AA==' WHERE id=1")
  c.execute("INSERT INTO submissions(submission_code,assessment_type,assessment_category,status,created_at,updated_at) VALUES('EMPTY-LEGACY','environment','heat','completed','2020-01-01','2020-01-01')")
  c.commit();return c
 def test_all_original_columns_preserved_including_zero_null_old_week_units(self):
  c=self.legacy_db();before=snapshot(c);apply(c)
  for table,state in before.items():
   rows=[dict(r) for r in c.execute('SELECT '+','.join(state['columns'])+f' FROM {table} ORDER BY id')]
   self.assertEqual(state['rows'],rows,table)
  self.assertEqual(c.execute('SELECT assessment_group FROM submissions WHERE id=4').fetchone()[0],'unknown')
  self.assertEqual(c.execute('SELECT working_hours_per_week FROM respondent_work_infos').fetchone()[0],None)
  self.assertEqual(c.execute('SELECT working_days_per_week FROM respondent_work_infos').fetchone()[0],5)
  self.assertEqual(c.execute("SELECT COUNT(*) FROM health_risk_answers WHERE phase='single' AND schema_version=1").fetchone()[0],10)
  self.assertEqual(c.execute('SELECT COUNT(*) FROM satisfaction_answers').fetchone()[0],8)
  self.assertFalse(c.execute('PRAGMA foreign_key_check').fetchall())
  report={'legacy_tables_preserved':list(before),'original_rows':{t:len(v['rows']) for t,v in before.items()},'legacy_revisions':c.execute('SELECT COUNT(*) FROM environment_revisions').fetchone()[0],'legacy_points':c.execute('SELECT COUNT(*) FROM environment_revision_points').fetchone()[0],'foreign_key_violations':0,'fixture_only':True}
  (ROOT/'docs/v3/baseline/p1-preservation.json').write_text(json.dumps(report,indent=2)+'\n')
 def test_legacy_snapshots_complete_and_immutable(self):
  c=self.legacy_db();apply(c)
  rev=c.execute("SELECT * FROM environment_revisions WHERE id='legacy-revision-1'").fetchone();self.assertEqual(rev['schema_version'],1);self.assertIsNone(json.loads(rev['inspection_snapshot_json'])['legacy_inspections'][0].get('serial_number'))
  p=c.execute('SELECT inputs_json FROM environment_revision_points WHERE legacy_point_id=1').fetchone();self.assertEqual(json.loads(p[0])['measure_value'],0)
  empty=c.execute("SELECT is_pass FROM environment_revisions WHERE submission_id=(SELECT id FROM submissions WHERE submission_code='EMPTY-LEGACY')").fetchone();self.assertIsNone(empty[0])
  for sql in ["UPDATE environment_revisions SET is_pass=0 WHERE id='legacy-revision-1'","DELETE FROM environment_revisions WHERE id='legacy-revision-1'","UPDATE environment_revision_points SET remark='changed' WHERE revision_id='legacy-revision-1'","DELETE FROM environment_revision_points WHERE revision_id='legacy-revision-1'","UPDATE submissions SET latest_revision_id='legacy-revision-2' WHERE id=1"]:
   with self.assertRaises(sqlite3.IntegrityError):c.execute(sql)
  self.assertEqual(c.execute('SELECT file_data FROM legacy_layout_snapshots').fetchone()[0],'AA==')
  with self.assertRaises(sqlite3.IntegrityError):c.execute("UPDATE legacy_layout_snapshots SET file_data='changed'")
 def test_retest_branch_constraints_provenance_and_finalized_sample_guards(self):
  c=self.legacy_db();apply(c)
  c.execute("INSERT INTO environment_revisions(id,submission_id,revision_no,base_revision_id,schema_version,kind,inspection_snapshot_json,scoring_version,standard_version,result_origin,created_at) VALUES('r2',2,2,'legacy-revision-2',1,'retest','{}','legacy','legacy','derived-legacy','2026-10-12')")
  with self.assertRaises(sqlite3.IntegrityError):c.execute("INSERT INTO environment_revisions(id,submission_id,revision_no,base_revision_id,schema_version,kind,inspection_snapshot_json,scoring_version,standard_version,result_origin,created_at) VALUES('race',2,2,'legacy-revision-2',1,'retest','{}','legacy','legacy','derived-legacy','2026-10-12')")
  with self.assertRaises(sqlite3.IntegrityError):c.execute("UPDATE submissions SET latest_revision_id='r2' WHERE id=2")
  with self.assertRaises(sqlite3.IntegrityError):c.execute("INSERT INTO environment_revision_points(submission_id,revision_id,point_key,point_order,category,location_desc,inputs_json,standard_snapshot_json,is_pass,measured_at,observation_kind,carried_from_revision_id,remark) SELECT 2,'r2',point_key,point_order,category,location_desc,inputs_json,standard_snapshot_json,is_pass,measured_at,'carried',revision_id,remark FROM environment_revision_points WHERE revision_id='legacy-revision-2' AND is_pass=0")
  c.execute("INSERT INTO environment_revision_points(submission_id,revision_id,point_key,point_order,category,location_desc,inputs_json,standard_snapshot_json,is_pass,measured_at,observation_kind,carried_from_revision_id,remark) SELECT 2,'r2',point_key,point_order,category,location_desc,inputs_json,standard_snapshot_json,is_pass,measured_at,'carried',revision_id,remark FROM environment_revision_points WHERE revision_id='legacy-revision-2' AND is_pass=1")
  c.execute("INSERT INTO environment_revision_points(submission_id,revision_id,point_key,point_order,category,location_desc,inputs_json,standard_snapshot_json,is_pass,measured_at,observation_kind) SELECT 2,'r2',point_key,point_order,category,location_desc,inputs_json,standard_snapshot_json,1,'2026-10-12T01:00:00Z','measured' FROM environment_revision_points WHERE revision_id='legacy-revision-2' AND is_pass=0")
  c.execute("INSERT INTO environment_revision_samples VALUES('r2','legacy-point-4','sample',1,'{}')")
  c.execute("UPDATE environment_revisions SET status='finalized' WHERE id='r2'");c.execute("UPDATE submissions SET latest_revision_id='r2' WHERE id=2")
  for sql in ["UPDATE environment_revision_samples SET values_json='{}' WHERE revision_id='r2'","DELETE FROM environment_revision_samples WHERE revision_id='r2'","INSERT INTO environment_revision_samples VALUES('r2','legacy-point-4','sample2',2,'{}')"]:
   with self.assertRaises(sqlite3.IntegrityError):c.execute(sql)
  c.execute("UPDATE submissions SET archived_at='2026-10-12' WHERE id=2")
  # D24: historical archive flags no longer block a valid next revision.
  c.execute("INSERT INTO environment_revisions(id,submission_id,revision_no,base_revision_id,schema_version,kind,inspection_snapshot_json,scoring_version,standard_version,result_origin,created_at) VALUES('r3',2,3,'r2',1,'retest','{}','legacy','legacy','derived-legacy','2026-10-12')")
  self.assertEqual(c.execute("SELECT COUNT(*) FROM environment_revisions WHERE id='r3'").fetchone()[0],1)
  with self.assertRaises(sqlite3.IntegrityError):c.execute("UPDATE submissions SET latest_revision_id='legacy-revision-2' WHERE id=2")
  self.assertFalse(c.execute('PRAGMA foreign_key_check').fetchall())
 def test_new_domain_constraints(self):
  c=self.legacy_db();apply(c)
  with self.assertRaises(sqlite3.IntegrityError):c.execute("UPDATE respondent_work_infos SET study_year=7")
  with self.assertRaises(sqlite3.IntegrityError):c.execute("UPDATE respondent_work_infos SET working_hours_per_week=169")
  c.execute('INSERT INTO health_contexts(submission_id,hours_worked_today) VALUES(3,0)');c.execute("INSERT INTO health_noise_sources VALUES(3,'none')")
  with self.assertRaises(sqlite3.IntegrityError):c.execute("INSERT INTO health_noise_sources VALUES(3,'traffic')")
  with self.assertRaises(sqlite3.IntegrityError):c.execute("INSERT INTO assessment_files(id,object_key,file_name,mime_type,byte_size,checksum_sha256,state,created_at,committed_at) VALUES('f','key','name','image/png',10485761,?, 'staged','2026',NULL)",('a'*64,))
 def test_v3_cannot_finalize_incomplete_points_or_staged_file(self):
  c=connection();apply(c)
  c.execute("INSERT INTO submissions(submission_code,assessment_type,assessment_category,status,created_at,updated_at,schema_version,assessment_group) VALUES('V3','environment','light','completed','2026','2026',3,'environment')")
  c.execute("INSERT INTO assessment_files(id,object_key,file_name,mime_type,byte_size,checksum_sha256,state,created_at,committed_at) VALUES('file','immutable/key','layout.png','image/png',1,?,'staged','2026',NULL)",('a'*64,))
  c.execute("INSERT INTO environment_revisions(id,submission_id,revision_no,schema_version,kind,inspection_snapshot_json,result_json,scoring_version,standard_version,result_origin,layout_file_id,measured_at,created_at,is_pass) VALUES('v3',1,1,3,'initial','{}','{}','v3','v3','server-v3','file','2026','2026',1)")
  with self.assertRaises(sqlite3.IntegrityError):c.execute("UPDATE environment_revisions SET status='finalized' WHERE id='v3'")
  c.execute("INSERT INTO environment_revision_points(submission_id,revision_id,point_key,point_order,category,location_desc,inputs_json,standard_snapshot_json,result_json,is_pass,measured_at,observation_kind) VALUES(1,'v3','p',1,'light','test','{}','{}','{}',1,'2026','measured')")
  with self.assertRaises(sqlite3.IntegrityError):c.execute("UPDATE environment_revisions SET status='finalized' WHERE id='v3'")
  c.execute("UPDATE assessment_files SET state='committed' WHERE id='file'")
  with self.assertRaises(sqlite3.IntegrityError):c.execute("UPDATE assessment_files SET object_key='changed' WHERE id='file'")
  with self.assertRaises(sqlite3.IntegrityError):c.execute("DELETE FROM assessment_files WHERE id='file'")
  c.execute("UPDATE environment_revisions SET status='finalized' WHERE id='v3'")
  c.execute("UPDATE submissions SET latest_revision_id='v3' WHERE id=1")
  with self.assertRaises(sqlite3.IntegrityError):c.execute("UPDATE environment_revision_points SET is_pass=0 WHERE revision_id='v3'")
if __name__=='__main__':unittest.main(verbosity=2)
