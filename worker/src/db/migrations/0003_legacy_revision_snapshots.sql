-- Snapshot existing records without modifying any original field or row.
-- Do not infer Area topology, TWA exposure duration, instrument serials or new survey answers.
INSERT INTO environment_revisions (
 id,submission_id,revision_no,schema_version,kind,inspection_snapshot_json,result_json,
 scoring_version,standard_version,result_origin,legacy_layout_pending,measured_at,created_at,is_pass
)
SELECT 'legacy-revision-'||s.id,s.id,1,1,'legacy',
 json_object('legacy_inspections',json(COALESCE((SELECT json_group_array(json_object(
  'id',i.id,'inspector_name',i.inspector_name,'position',i.position,'inspection_location',i.inspection_location,
  'inspection_date',i.inspection_date,'equipment',i.equipment,'measurement_technique',i.measurement_technique,
  'start_time',i.start_time,'end_time',i.end_time,'created_at',i.created_at)) FROM environment_inspections i WHERE i.submission_id=s.id),'[]'))),
 (SELECT json_object('id',a.id,'total_score',a.total_score,'risk_level',a.risk_level,'calculated_value',a.calculated_value,
  'is_pass',a.is_pass,'message',a.message,'recommendations_json',a.recommendations_json,'created_at',a.created_at)
  FROM assessment_results a WHERE a.submission_id=s.id),
 'legacy-unverified','legacy-unknown',
 CASE WHEN EXISTS(SELECT 1 FROM assessment_results a WHERE a.submission_id=s.id) THEN 'legacy-cache'
 WHEN EXISTS(SELECT 1 FROM environment_measurement_points p WHERE p.submission_id=s.id) THEN 'derived-legacy' ELSE 'unknown-legacy' END,
 s.has_layout,s.completed_at,s.created_at,
 CASE WHEN EXISTS(SELECT 1 FROM environment_measurement_points p WHERE p.submission_id=s.id) THEN
  (SELECT min(p.is_pass) FROM environment_measurement_points p WHERE p.submission_id=s.id) ELSE NULL END
FROM submissions s WHERE s.assessment_type='environment';
INSERT INTO environment_revision_points (
 submission_id,revision_id,point_key,point_order,category,location_desc,inputs_json,standard_snapshot_json,
 is_pass,measured_at,observation_kind,legacy_point_id,remark
)
SELECT p.submission_id,'legacy-revision-'||p.submission_id,'legacy-point-'||p.id,
 ROW_NUMBER() OVER(PARTITION BY p.submission_id ORDER BY p.point_no,p.id),p.category,p.location_desc,
 json_object('legacy_point_no',p.point_no,'measure_value',p.measure_value,'min_value',p.min_value,'max_value',p.max_value,
  'workload',p.workload,'temp_db',p.temp_db,'temp_wb',p.temp_wb,'temp_gt',p.temp_gt,'temp_wbgt',p.temp_wbgt,
  'wbgt_type',p.wbgt_type,'start_time',p.start_time,'end_time',p.end_time,'total_time',p.total_time,'created_at',p.created_at),
 json_object('version','legacy-unknown','standard_value',p.standard_value,'standard_display',p.standard_display),
 p.is_pass,s.completed_at,'legacy',p.id,p.remark
FROM environment_measurement_points p JOIN submissions s ON s.id=p.submission_id WHERE s.assessment_type='environment';
INSERT INTO legacy_layout_snapshots(revision_id,file_name,file_type,file_size,file_data,has_layout)
SELECT 'legacy-revision-'||id,layout_file_name,layout_file_type,layout_file_size,layout_file_data,has_layout FROM submissions WHERE assessment_type='environment' AND (has_layout=1 OR layout_file_data IS NOT NULL);
UPDATE environment_revisions SET status='finalized' WHERE kind='legacy';
UPDATE submissions SET latest_revision_id='legacy-revision-'||id WHERE assessment_type='environment';
