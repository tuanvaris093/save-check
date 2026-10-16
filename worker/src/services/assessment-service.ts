import {
  validateSubmission,
  validateEffectiveEnvironment,
  unchangedHeatUnitIds,
  evaluateSubmission,
  evaluateEnvironment,
  evaluateUnit,
  prepareRetest,
  retestSchema,
  programSnapshot,
  questionSnapshots,
  QUESTIONNAIRE_VERSION,
  satisfactionQuestionnaireVersion,
  satisfactionQuestionSnapshots,
  SCORING_VERSION,
  STANDARD_VERSIONS,
  type CreateSubmissionV3,
  type EnvironmentSubmissionV3,
  type EnvironmentRevisionV3,
} from "../../../shared/v3";
import type { Env } from "../types";
import { ApiError, canonical, digest, fail } from "../lib/errors";
import {
  AssessmentRepository,
  type Header,
} from "../repositories/assessment-repository";
import { FileService } from "./file-service";
import {
  correctionCommandSchema as correctionSchema,
  legacySupplementSchema as supplementSchema,
} from "../../../shared/v3";
export class AssessmentService {
  readonly repo: AssessmentRepository;
  readonly files: FileService;
  constructor(readonly env: Env) {
    this.repo = new AssessmentRepository(env.DB);
    this.files = new FileService(env);
  }
  parse(input: unknown) {
    const result = validateSubmission(input);
    if (!result.success)
      throw new ApiError(
        400,
        result.error.code,
        result.error.message,
        result.error.issues,
      );
    return result.data;
  }
  resolved(payload: CreateSubmissionV3) {
    return {
      questionnaire_version:
        payload.assessment_type === "environment"
          ? null
          : payload.assessment_type === "satisfaction"
            ? satisfactionQuestionnaireVersion(
                payload.assessment_group as "environment" | "health",
              )
            : QUESTIONNAIRE_VERSION,
      program:
        "workInfo" in payload
          ? programSnapshot(payload.workInfo.program_code)
          : null,
      questions:
        payload.assessment_type === "health_risk"
          ? payload.assessment_category === "light"
            ? {
                before: questionSnapshots("light", "before"),
                after: questionSnapshots("light", "after"),
              }
            : {
                single: questionSnapshots(
                  payload.assessment_category,
                  "single",
                ),
              }
          : payload.assessment_type === "satisfaction"
            ? satisfactionQuestionSnapshots(payload.assessment_group)
            : null,
    };
  }
  summary(
    payload: CreateSubmissionV3,
    result: ReturnType<typeof evaluateSubmission>,
  ) {
    if (payload.assessment_type === "environment") {
      const env = evaluateEnvironment(payload.units);
      return { score: null, level: env.is_pass ? "pass" : "high_risk" };
    }
    const record = result as unknown as Record<string, unknown>;
    return payload.assessment_type === "satisfaction"
      ? { score: record.overall_mean, level: "pass" }
      : payload.assessment_category === "light"
        ? { score: record.after_total, level: record.after_level }
        : { score: record.total, level: record.level };
  }
  payloadVersion(
    code: string,
    version: number,
    operation: string,
    payload: CreateSubmissionV3,
    result: unknown,
    now: string,
  ) {
    return this.repo.sql(
      `INSERT INTO submission_payload_versions(submission_id,version_no,operation,payload_json,result_json,resolved_json,created_at) VALUES((SELECT id FROM submissions WHERE submission_code=?),?,?,?,?,?,?)`,
      code,
      version,
      operation,
      JSON.stringify(payload),
      JSON.stringify(result),
      JSON.stringify(this.resolved(payload)),
      now,
    );
  }
  normalized(
    code: string,
    payload: CreateSubmissionV3,
    now: string,
    replace = false,
  ): D1PreparedStatement[] {
    const statements: D1PreparedStatement[] = [];
    const sid = "(SELECT id FROM submissions WHERE submission_code=?)";
    if (replace)
      for (const table of [
        "health_noise_sources",
        "health_contexts",
        "satisfaction_metadata",
        "health_risk_answers",
        "satisfaction_answers",
        "respondent_profiles",
        "respondent_work_infos",
        "assessment_results",
      ])
        statements.push(
          this.repo.sql(
            `DELETE FROM ${table} WHERE submission_id=${sid}`,
            code,
          ),
        );
    if ("profile" in payload) {
      const p = payload.profile;
      const full = "gender" in p ? p : null;
      statements.push(
        this.repo.sql(
          `INSERT INTO respondent_profiles(submission_id,full_name,gender,age,weight,height,education_level,marital_status,has_underlying_disease,underlying_disease_details,created_at) VALUES(${sid},?,?,?,?,?,?,?,?,?,?)`,
          code,
          p.full_name,
          full?.gender,
          full?.age,
          full?.weight,
          full?.height,
          full?.education_level,
          full?.marital_status,
          full ? Number(full.has_underlying_disease) : null,
          full?.underlying_disease_details,
          now,
        ),
      );
    }
    if ("workInfo" in payload) {
      const w = payload.workInfo,
        snapshot = programSnapshot(w.program_code);
      statements.push(
        this.repo.sql(
          `INSERT INTO respondent_work_infos(submission_id,position_type,program_code,program_label,program_version,study_year,other_context,work_experience_years,working_hours_per_day,working_hours_per_week,created_at) VALUES(${sid},?,?,?,?,?,?,?,?,?,?)`,
          code,
          w.position_type,
          w.program_code,
          snapshot.label,
          snapshot.version,
          w.study_year,
          w.other_context,
          "work_experience_years" in w ? w.work_experience_years : null,
          "working_hours_per_day" in w ? w.working_hours_per_day : null,
          "working_hours_per_week" in w ? w.working_hours_per_week : null,
          now,
        ),
      );
    }
    if (payload.assessment_type === "health_risk") {
      if ("healthContext" in payload) {
        const ctx = payload.healthContext;
        statements.push(
          this.repo.sql(
            `INSERT INTO health_contexts(submission_id,hours_worked_today,noise_source_other) VALUES(${sid},?,?)`,
            code,
            "hours_worked_today" in ctx ? ctx.hours_worked_today : null,
            "noise_source_other" in ctx ? ctx.noise_source_other : null,
          ),
        );
        if ("noise_sources" in ctx)
          statements.push(
            this.repo.sql(
              `INSERT INTO health_noise_sources(submission_id,source_code) SELECT ${sid},value FROM json_each(?)`,
              code,
              JSON.stringify(ctx.noise_sources),
            ),
          );
      }
      const answers: {
        phase: string;
        question_id: string;
        question_no: number;
        question_text: string;
        score: number;
      }[] = [];
      const phases =
        payload.assessment_category === "light"
          ? (["before", "after"] as const)
          : (["single"] as const);
      for (const phase of phases) {
        const values = (
          payload.answers as Record<string, Record<string, number>>
        )[phase];
        questionSnapshots(payload.assessment_category, phase).forEach((q, i) =>
          answers.push({
            phase,
            question_id: q.question_id,
            question_no: i + 1,
            question_text: q.text,
            score: values[q.question_id],
          }),
        );
      }
      statements.push(
        this.repo.sql(
          `INSERT INTO health_risk_answers(submission_id,category,question_id,question_no,question_text,score,created_at,phase,schema_version,questionnaire_version) SELECT ${sid},?,json_extract(value,'$.question_id'),json_extract(value,'$.question_no'),json_extract(value,'$.question_text'),json_extract(value,'$.score'),?,json_extract(value,'$.phase'),3,? FROM json_each(?)`,
          code,
          payload.assessment_category,
          now,
          QUESTIONNAIRE_VERSION,
          JSON.stringify(answers),
        ),
      );
    }
    if (payload.assessment_type === "satisfaction") {
      statements.push(
        this.repo.sql(
          `INSERT INTO satisfaction_answers(submission_id,question_id,category,rating,suggestion,created_at) SELECT ${sid},key,CASE WHEN CAST(substr(key,2) AS INTEGER)<=4 THEN 'accuracy' WHEN CAST(substr(key,2) AS INTEGER)<=8 THEN 'design' WHEN CAST(substr(key,2) AS INTEGER)<=12 THEN 'usability' ELSE 'usefulness' END,value,?,? FROM json_each(?)`,
          code,
          payload.suggestion,
          now,
          JSON.stringify(payload.answers),
        ),
      );
      const result = evaluateSubmission(payload) as unknown as {
        durations?: {
          traditional_seconds: number;
          safecheck_seconds: number;
          source: string;
        };
      };
      statements.push(
        this.repo.sql(
          `INSERT INTO satisfaction_metadata(submission_id,suggestion,traditional_duration_seconds,safecheck_duration_seconds,duration_source,questionnaire_version) VALUES(${sid},?,?,?,?,?)`,
          code,
          payload.suggestion,
          result.durations?.traditional_seconds,
          result.durations?.safecheck_seconds,
          result.durations?.source,
          satisfactionQuestionnaireVersion(
            payload.assessment_group as "environment" | "health",
          ),
        ),
      );
    }
    const result =
        payload.assessment_type === "environment"
          ? evaluateEnvironment(payload.units)
          : evaluateSubmission(payload),
      summary = this.summary(payload, result);
    statements.push(
      this.repo.sql(
        `INSERT INTO assessment_results(submission_id,assessment_type,assessment_category,total_score,risk_level,is_pass,result_json,scoring_version,result_origin,created_at) VALUES(${sid},?,?,?,?,?,?,?,'server-v3',?)`,
        code,
        payload.assessment_type,
        payload.assessment_category,
        summary.score,
        summary.level,
        payload.assessment_type === "environment"
          ? Number(evaluateEnvironment(payload.units).is_pass)
          : null,
        JSON.stringify(result),
        SCORING_VERSION,
        now,
      ),
    );
    return statements;
  }
  revisionStatements(
    code: string,
    revision: EnvironmentRevisionV3,
    kind: string,
    now: string,
    reason: string | null = null,
  ): D1PreparedStatement[] {
    const result = evaluateEnvironment(
      revision.observations.map((o) => o.unit),
    );
    const category = result.results[0].kind.startsWith("light")
      ? "light"
      : result.results[0].kind;
    const statements = [
      ...(revision.layout_file_id
        ? [this.files.commit(revision.layout_file_id, now)]
        : []),
      this.repo.sql(
        `INSERT INTO environment_revisions(id,submission_id,revision_no,base_revision_id,schema_version,kind,inspection_snapshot_json,result_json,scoring_version,standard_version,result_origin,layout_file_id,measured_at,created_at,is_pass,correction_reason) VALUES(?,(SELECT id FROM submissions WHERE submission_code=?),?,?,3,?,?,?,?,?,'server-v3',?,?,?,?,?)`,
        revision.revision_id,
        code,
        revision.revision_no,
        revision.base_revision_id,
        kind,
        JSON.stringify(revision.inspectionData),
        JSON.stringify(result),
        SCORING_VERSION,
        STANDARD_VERSIONS[category as "light" | "noise" | "heat"],
        revision.layout_file_id,
        revision.inspectionData.start_at,
        now,
        Number(result.is_pass),
        reason,
      ),
    ];
    const points = revision.observations.map((o, i) => ({
      key: o.unit.point_id,
      order: i + 1,
      category: o.unit.kind.startsWith("light") ? "light" : o.unit.kind,
      location: o.unit.location_desc,
      inputs: JSON.stringify(o.unit),
      standard: JSON.stringify(o.result.standard),
      result: JSON.stringify(o.result),
      is_pass: Number(o.result.is_pass),
      measured_at: o.measured_at,
      kind: o.observation_kind,
      source: o.carried_from_revision_id,
      remark: o.unit.remark,
    }));
    statements.push(
      this.repo.sql(
        `INSERT INTO environment_revision_points(submission_id,revision_id,point_key,point_order,category,location_desc,inputs_json,standard_snapshot_json,result_json,is_pass,measured_at,observation_kind,carried_from_revision_id,remark) SELECT (SELECT id FROM submissions WHERE submission_code=?),?,json_extract(value,'$.key'),json_extract(value,'$.order'),json_extract(value,'$.category'),json_extract(value,'$.location'),json_extract(value,'$.inputs'),json_extract(value,'$.standard'),json_extract(value,'$.result'),json_extract(value,'$.is_pass'),json_extract(value,'$.measured_at'),json_extract(value,'$.kind'),json_extract(value,'$.source'),json_extract(value,'$.remark') FROM json_each(?)`,
        code,
        revision.revision_id,
        JSON.stringify(points),
      ),
    );
    const samples = revision.observations.flatMap((o) =>
      o.unit.kind === "light_area"
        ? (o.unit.samples ?? []).map((sample, i) => ({
            point: o.unit.point_id,
            key: sample.sample_id,
            order: i + 1,
            values: JSON.stringify(sample),
          }))
        : o.unit.kind === "heat" && o.unit.intervals
          ? o.unit.intervals.map((sample, i) => ({
              point: o.unit.point_id,
              key: `interval-${i + 1}`,
              order: i + 1,
              values: JSON.stringify(sample),
            }))
          : [],
    );
    if (samples.length)
      statements.push(
        this.repo.sql(
          `INSERT INTO environment_revision_samples(revision_id,point_key,sample_key,sample_order,values_json) SELECT ?,json_extract(value,'$.point'),json_extract(value,'$.key'),json_extract(value,'$.order'),json_extract(value,'$.values') FROM json_each(?)`,
          revision.revision_id,
          JSON.stringify(samples),
        ),
      );
    statements.push(
      this.repo.sql(
        "UPDATE environment_revisions SET status='finalized' WHERE id=?",
        revision.revision_id,
      ),
    );
    return statements;
  }
  initialRevision(
    payload: EnvironmentSubmissionV3,
    id: string,
    base: EnvironmentRevisionV3 | null = null,
  ): EnvironmentRevisionV3 {
    return {
      revision_id: id,
      kind: base ? "correction" : "initial",
      submission_id: base?.submission_id ?? 0,
      revision_no: base ? base.revision_no + 1 : 1,
      base_revision_id: base?.revision_id ?? null,
      schema_version: 3,
      scoring_version: SCORING_VERSION,
      inspectionData: payload.inspectionData,
      layout_file_id: payload.layout?.file_id ?? null,
      observations: payload.units.map((unit) => ({
        unit,
        result: evaluateUnit(unit),
        measured_at:
          unit.kind === "heat"
            ? unit.start_at
            : payload.inspectionData.start_at,
        observation_kind: "measured",
        carried_from_revision_id: null,
      })),
      is_pass: evaluateEnvironment(payload.units).is_pass,
      archived: false,
    };
  }
  async create(input: unknown, pending?: { id: string; version: number }) {
    const payload = this.parse(input),
      scope = "create",
      key = payload.idempotency_key,
      hash = await digest(canonical(pending ? { payload, pending } : payload));
    const replay = await this.repo.replay(scope, key, hash);
    if (replay) return replay;
    if (
      pending &&
      (payload.assessment_type !== "health_risk" ||
        payload.assessment_category !== "light" ||
        key !== pending.id)
    )
      fail(
        400,
        "PENDING_MISMATCH",
        "รายการรอทำต่อต้องเป็นอาการทางสุขภาพด้านแสงและใช้รหัสเดิม",
      );
    if (
      !pending &&
      payload.assessment_type === "health_risk" &&
      payload.assessment_category === "light" &&
      (await this.env.DB.prepare(
        "SELECT id FROM health_light_drafts WHERE id=?",
      )
        .bind(key)
        .first())
    )
      fail(
        409,
        "PENDING_ACTION_REQUIRED",
        "กรุณาบันทึกผลจากแบบประเมินที่เปิดทำต่อ",
      );
    if (payload.assessment_type === "environment" && payload.layout)
      await this.files.usable(payload.layout.file_id);
    const now = new Date().toISOString(),
      code = `SUB-${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replace(/-/g, "")}-${crypto.randomUUID().slice(0, 8)}`,
      revisionId =
        payload.assessment_type === "environment" ? crypto.randomUUID() : null;
    const result = evaluateSubmission(payload),
      summary = this.summary(payload, result),
      response = {
        submission_code: code,
        schema_version: 3,
        data_version: 1,
        revision_id: revisionId,
        result,
        message: "บันทึกข้อมูลการประเมินเรียบร้อยแล้ว",
      };
    const statements = [
      this.repo.sql(
        `INSERT INTO submissions(submission_code,assessment_type,assessment_category,status,assessment_group,schema_version,questionnaire_version,scoring_version,overall_score,overall_level,has_layout,started_at,completed_at,created_at,updated_at) VALUES(?,?,?,'completed',?,3,?,?,?,?,?,?,?,?,?)`,
        code,
        payload.assessment_type,
        payload.assessment_category,
        payload.assessment_group,
        payload.assessment_type === "environment"
          ? "not_applicable"
          : payload.assessment_type === "satisfaction"
            ? satisfactionQuestionnaireVersion(
                payload.assessment_group as "environment" | "health",
              )
            : QUESTIONNAIRE_VERSION,
        SCORING_VERSION,
        summary.score,
        summary.level,
        payload.assessment_type === "environment" && payload.layout ? 1 : 0,
        now,
        now,
        now,
        now,
      ),
      ...this.normalized(code, payload, now),
      this.payloadVersion(code, 1, "create", payload, result, now),
    ];
    if (payload.assessment_type === "environment") {
      const revision = this.initialRevision(payload, revisionId!);
      statements.push(
        ...this.revisionStatements(code, revision, "initial", now),
        this.repo.sql(
          "UPDATE submissions SET latest_revision_id=? WHERE submission_code=?",
          revisionId,
          code,
        ),
      );
    }
    if (
      !pending &&
      payload.assessment_type === "health_risk" &&
      payload.assessment_category === "light"
    ) {
      const token = crypto.randomUUID();
      statements.push(
        this.repo.precondition(
          token,
          "NOT EXISTS(SELECT 1 FROM health_light_drafts WHERE id=?)",
          key,
        ),
        this.repo.finishCondition(token),
      );
    }
    statements.push(
      ...(pending
        ? [
            this.repo.sql(
              `INSERT INTO health_light_draft_completions(draft_id,draft_version,submission_id,created_at) VALUES(?,?,(SELECT id FROM submissions WHERE submission_code=?),?)`,
              pending.id,
              pending.version,
              code,
              now,
            ),
          ]
        : []),
      this.repo.ledger(scope, key, hash, code, response, now, revisionId),
    );
    return this.repo.commit(statements, scope, key, hash);
  }
  async retest(code: string, input: unknown) {
    const request = retestSchema.parse(input),
      scope = `retest:${code}`,
      hash = await digest(canonical(request));
    const replay = await this.repo.replay(scope, request.idempotency_key, hash);
    if (replay) return replay;
    const h = await this.repo.header(code);
    if (h.assessment_type !== "environment")
      fail(409, "NOT_ELIGIBLE", "ตรวจซ้ำใช้กับสภาพแวดล้อมเท่านั้น");
    const base = await this.repo.revision(h),
      now = new Date().toISOString(),
      id = crypto.randomUUID();
    const revision = prepareRetest(base, request, id);
    if (revision.layout_file_id)
      await this.files.usable(revision.layout_file_id);
    const measuredPayload = this.parse({
      schema_version: 3,
      idempotency_key: request.idempotency_key,
      assessment_type: "environment",
      assessment_group: "environment",
      assessment_category: h.assessment_category,
      inspectionData: revision.inspectionData,
      ...(revision.layout_file_id
        ? { layout: { file_id: revision.layout_file_id } }
        : {}),
      units: revision.observations
        .filter((o) => o.observation_kind === "measured")
        .map((o) => o.unit),
    }) as EnvironmentSubmissionV3;
    // Each round stores its own inspection metadata. Carried observations
    // retain their original measurements and timestamps.
    const payload: EnvironmentSubmissionV3 = {
      ...measuredPayload,
      units: revision.observations.map((o) => o.unit),
    };
    const result = evaluateEnvironment(payload.units),
      summary = this.summary(payload, result),
      version = h.data_version + 1,
      response = {
        id: h.id,
        submission_code: code,
        revision_id: id,
        revision_no: revision.revision_no,
        data_version: version,
        result,
      };
    const condition = crypto.randomUUID();
    const statements = [
      this.repo.precondition(
        condition,
        "SELECT COUNT(*)=1 FROM submissions WHERE id=? AND latest_revision_id=? AND data_version=?",
        h.id,
        request.base_revision_id,
        h.data_version,
      ),
      ...this.revisionStatements(code, revision, "retest", now),
      this.payloadVersion(code, version, "retest", payload, result, now),
      this.repo.sql(
        "UPDATE submissions SET latest_revision_id=?,data_version=?,overall_score=?,overall_level=?,has_layout=?,completed_at=?,updated_at=? WHERE id=?",
        id,
        version,
        summary.score,
        summary.level,
        Number(Boolean(revision.layout_file_id)),
        now,
        now,
        h.id,
      ),
      this.repo.sql(
        "UPDATE assessment_results SET result_json=?,is_pass=?,risk_level=?,scoring_version=?,created_at=? WHERE submission_id=?",
        JSON.stringify(result),
        Number(revision.is_pass),
        summary.level,
        SCORING_VERSION,
        now,
        h.id,
      ),
      this.repo.finishCondition(condition),
      this.repo.ledger(
        scope,
        request.idempotency_key,
        hash,
        code,
        response,
        now,
        id,
      ),
    ];
    return this.repo.commit(statements, scope, request.idempotency_key, hash);
  }
  audit(
    h: Header,
    action: string,
    before: unknown,
    after: unknown,
    reason: string,
    now: string,
    revisionId: string | null,
  ) {
    return this.repo.sql(
      "INSERT INTO assessment_audit_events(id,submission_id,revision_id,action,before_json,after_json,reason,created_at) VALUES(?,?,?,?,?,?,?,?)",
      crypto.randomUUID(),
      h.id,
      revisionId,
      action,
      JSON.stringify(before),
      JSON.stringify(after),
      reason,
      now,
    );
  }

  async correct(code: string, input: unknown) {
    const request = correctionSchema.parse(input),
      scope = `correction:${code}`,
      hash = await digest(canonical(request));
    const replay = await this.repo.replay(scope, request.idempotency_key, hash);
    if (replay) return replay;
    const h = await this.repo.header(code);
    if (h.schema_version !== 3)
      fail(
        409,
        "LEGACY_UPGRADE_REQUIRED",
        "ข้อมูลเก่าต้องผ่านการยืนยันก่อนแก้ไข",
      );
    if (h.data_version !== request.expected_data_version)
      fail(409, "CONFLICT", "ข้อมูลไม่ตรงกับข้อมูลล่าสุด กรุณาโหลดใหม่");
    const environmentBase =
      h.assessment_type === "environment" ? await this.repo.revision(h) : null;
    const inputUnits =
      request.payload && typeof request.payload === "object"
        ? (request.payload as Record<string, unknown>).units
        : undefined;
    const unchangedHeatIds = environmentBase
      ? unchangedHeatUnitIds(
          environmentBase.observations.map((o) => o.unit),
          inputUnits,
        )
      : new Set<string>();
    const checked = environmentBase
      ? validateEffectiveEnvironment(request.payload, unchangedHeatIds)
      : null;
    if (checked && !checked.success)
      throw new ApiError(
        400,
        checked.error.code,
        checked.error.message,
        checked.error.issues,
      );
    const payload = checked?.success
      ? checked.data
      : this.parse(request.payload);
    if (
      payload.assessment_type === "satisfaction" &&
      h.questionnaire_version !==
        satisfactionQuestionnaireVersion(payload.assessment_group)
    )
      fail(
        409,
        "NEW_ASSESSMENT_REQUIRED",
        "ชุดคำถามได้รับการปรับปรุง กรุณาสร้างแบบประเมินใหม่เพื่อรักษาคำตอบที่บันทึกไว้",
      );
    if (
      payload.assessment_type !== h.assessment_type ||
      payload.assessment_group !== h.assessment_group ||
      payload.assessment_category !== h.assessment_category
    )
      fail(400, "LOCKED_FIELD", "เปลี่ยนชนิดหรือหมวดงานไม่ได้");
    const old = await this.repo.version(h);
    if (!old) fail(409, "VERSION_NOT_FOUND", "ไม่พบข้อมูลที่บันทึกไว้");
    const now = new Date().toISOString(),
      version = h.data_version + 1,
      result =
        payload.assessment_type === "environment"
          ? evaluateEnvironment(payload.units)
          : evaluateSubmission(payload),
      summary = this.summary(payload, result),
      token = crypto.randomUUID();
    const statements = [
      this.repo.precondition(
        token,
        "SELECT COUNT(*)=1 FROM submissions WHERE id=? AND data_version=?",
        h.id,
        request.expected_data_version,
      ),
    ];
    let revisionId: string | null = null;
    if (payload.assessment_type === "environment") {
      const base = environmentBase!;
      if (request.base_revision_id !== base.revision_id)
        fail(409, "CONFLICT", "รอบฐานไม่ตรงล่าสุด");
      if (
        payload.inspectionData.measurement_technique !==
        base.inspectionData.measurement_technique
      )
        fail(400, "NEW_JOB_REQUIRED", "เปลี่ยนเทคนิคต้องสร้างงานใหม่");
      const locked = (u: EnvironmentSubmissionV3["units"][number]) => {
        const { point_id, kind } = u;
        return kind === "light_spot"
          ? {
              point_id,
              kind,
              standard_code: u.standard_code,
              standard_target_lux: u.standard_target_lux,
            }
          : kind === "light_area"
            ? {
                point_id,
                kind,
                standard_code: u.standard_code,
              }
            : kind === "noise"
              ? {
                  point_id,
                  kind,
                  basis: u.evaluation_basis,
                  duration: u.exposure_duration_minutes,
                }
              : {
                  point_id,
                  kind,
                  wbgt_type: u.wbgt_type,
                  workload: u.workload,
                  standard_value: u.standard_value,
                };
      };
      if (
        payload.units.length !== base.observations.length ||
        payload.units.some((u) => {
          const previous = base.observations.find(
            (o) => o.unit.point_id === u.point_id,
          );
          return (
            !previous ||
            (u.kind === "light_area" &&
              previous.unit.kind === "light_area" &&
              u.samples !== undefined &&
              canonical(u.samples.map((s) => s.sample_id).sort()) !==
                canonical(
                  (previous.unit.samples ?? []).map((s) => s.sample_id).sort(),
                )) ||
            canonical(locked(u)) !== canonical(locked(previous.unit))
          );
        })
      )
        fail(400, "NEW_JOB_REQUIRED", "เปลี่ยนจุดหรือเกณฑ์ต้องสร้างงานใหม่");
      if (payload.layout) await this.files.usable(payload.layout.file_id);
      revisionId = crypto.randomUUID();
      const revision = this.initialRevision(payload, revisionId, base);
      revision.observations = revision.observations.map((o) => {
        if (!unchangedHeatIds.has(o.unit.point_id)) return o;
        const previous = base.observations.find(
          (p) => p.unit.point_id === o.unit.point_id,
        )!;
        const carry =
          previous.result.is_pass &&
          previous.unit.location_desc === o.unit.location_desc &&
          previous.unit.remark === o.unit.remark;
        // D1 carry guards require an exact passed snapshot. Metadata corrections
        // keep the actual measurement time but are identified by revision kind.
        return carry
          ? {
              ...previous,
              unit: previous.unit,
              result: previous.result,
              observation_kind: "carried",
              carried_from_revision_id:
                previous.carried_from_revision_id || base.revision_id,
            }
          : { ...o, measured_at: previous.measured_at };
      });
      statements.push(
        ...this.revisionStatements(
          code,
          revision,
          "correction",
          now,
          request.reason,
        ),
      );
    } else if (request.base_revision_id)
      fail(400, "REVISION_NOT_APPLICABLE", "งานนี้ใช้ data_version");
    statements.push(
      ...this.normalized(code, payload, now, true),
      this.payloadVersion(code, version, "correction", payload, result, now),
      this.repo.sql(
        "UPDATE submissions SET data_version=?,latest_revision_id=?,overall_score=?,overall_level=?,has_layout=?,updated_at=? WHERE id=?",
        version,
        revisionId ?? h.latest_revision_id,
        summary.score,
        summary.level,
        payload.assessment_type === "environment" && payload.layout ? 1 : 0,
        now,
        h.id,
      ),
      this.audit(
        h,
        "correction",
        JSON.parse(old.payload_json),
        payload,
        request.reason,
        now,
        revisionId,
      ),
      this.repo.finishCondition(token),
    );
    const response = {
      id: h.id,
      submission_code: code,
      data_version: version,
      revision_id: revisionId,
      result,
    };
    statements.push(
      this.repo.ledger(
        scope,
        request.idempotency_key,
        hash,
        code,
        response,
        now,
        revisionId,
      ),
    );
    return this.repo.commit(statements, scope, request.idempotency_key, hash);
  }
  async supplement(code: string, input: unknown) {
    const request = supplementSchema.parse(input),
      scope = `supplement:${code}`,
      hash = await digest(canonical(request));
    const replay = await this.repo.replay(scope, request.idempotency_key, hash);
    if (replay) return replay;
    const h = await this.repo.header(code);
    if (h.assessment_type !== "environment")
      fail(409, "NOT_ELIGIBLE", "ใช้กับงานสภาพแวดล้อมเดิม");
    const source = await this.repo.revisionRow(h);
    if (source.schema_version !== 1 || source.id !== request.base_revision_id)
      fail(409, "CONFLICT", "ต้องเติมข้อมูลจากรอบ legacy ล่าสุด");
    const already = await this.repo
      .sql(
        "SELECT id FROM environment_metadata_supplements WHERE submission_id=?",
        h.id,
      )
      .first();
    if (already) fail(409, "SUPPLEMENT_EXISTS", "งานนี้เติมข้อมูลไปแล้ว");
    const points = (
      await this.repo
        .sql(
          "SELECT * FROM environment_revision_points WHERE revision_id=? ORDER BY point_order",
          source.id,
        )
        .all<{
          point_key: string;
          category: string;
          location_desc: string;
          inputs_json: string;
          standard_snapshot_json: string;
          is_pass: number | null;
          measured_at: string | null;
          remark: string | null;
        }>()
    ).results;
    if (points.length !== request.units.length || !points.length)
      fail(
        400,
        "LEGACY_POINT_MAPPING",
        "ต้องยืนยันจุดเดิมครบโดยไม่เพิ่มหรือลบ",
      );
    const oldInspection = JSON.parse(source.inspection_snapshot_json) as {
      legacy_inspections?: Record<string, unknown>[];
    };
    const original = oldInspection.legacy_inspections?.[0];
    if ((oldInspection.legacy_inspections?.length ?? 0) > 1)
      fail(
        409,
        "AMBIGUOUS_LEGACY",
        "ข้อมูลเดิมมีหลายชุดตรวจ กรุณาตรวจสอบก่อนเริ่มงานใหม่",
      );
    for (const field of [
      "inspector_name",
      "position",
      "inspection_location",
      "inspection_date",
      "equipment",
    ] as const) {
      if (
        original?.[field] &&
        request.inspectionData[field] !== original[field]
      )
        fail(400, "LOCKED_FIELD", `ข้อมูลเดิม ${field} ถูกล็อก`);
    }
    for (const unit of request.units) {
      const old = points.find((p) => p.point_key === unit.point_id);
      if (
        !old ||
        old.location_desc !== unit.location_desc ||
        (unit.remark !== null && old.remark !== unit.remark)
      )
        fail(400, "LOCKED_FIELD", "ต้องใช้รหัส ตำแหน่ง และหมายเหตุของจุดเดิม");
      const raw = JSON.parse(old.inputs_json) as Record<string, unknown>,
        standard = JSON.parse(old.standard_snapshot_json) as {
          standard_value: number | null;
        };
      const same = (oldValue: unknown, value: unknown) =>
        oldValue === null || oldValue === undefined || oldValue === value;
      if (unit.kind === "light_spot") {
        if (
          old.category !== "light" ||
          !same(raw.measure_value, unit.lux) ||
          !same(standard.standard_value, unit.standard_target_lux)
        )
          fail(400, "LEGACY_BASIS_REQUIRED", "ค่าแสงและเกณฑ์ต้องตรงข้อมูลเดิม");
        if (unit.surrounding_near_lux !== undefined)
          fail(
            409,
            "NEW_JOB_REQUIRED",
            "ข้อมูลเดิมไม่มีค่าบริเวณโดยรอบที่ยืนยันได้ กรุณาสร้างงานใหม่",
          );
      } else if (unit.kind === "light_area")
        fail(
          409,
          "NEW_JOB_REQUIRED",
          "ข้อมูลเดิมไม่มีโครงสร้าง Area ที่ยืนยันได้ กรุณาสร้างงานใหม่",
        );
      else if (unit.kind === "noise") {
        const measured =
          unit.evaluation_basis === "twa8"
            ? unit.twa_8hr
            : unit.exposure_level_dBA;
        if (
          old.category !== "noise" ||
          !same(raw.measure_value, measured) ||
          !same(raw.min_value, unit.min_dBA) ||
          !same(raw.max_value, unit.max_dBA)
        )
          fail(
            400,
            "LEGACY_BASIS_REQUIRED",
            "ต้องยืนยันชนิดค่าที่วัดและคงตัวเลขเดิม",
          );
        const evaluated = evaluateUnit(unit);
        if (standard.standard_value !== evaluated.standard.thresholds.limit)
          fail(
            409,
            "NEW_JOB_REQUIRED",
            "วิธีที่ยืนยันมีเกณฑ์ต่างจากเดิม กรุณาสร้างงานใหม่",
          );
      } else if (
        old.category !== "heat" ||
        unit.input_mode !== "meter_average" ||
        !same(raw.measure_value, unit.wbgt_average) ||
        !same(
          standard.standard_value,
          evaluateUnit(unit).standard.thresholds.limit,
        ) ||
        !same(raw.workload, unit.workload) ||
        !same(raw.wbgt_type, unit.wbgt_type)
      )
        fail(
          409,
          "NEW_JOB_REQUIRED",
          "ต้องมีข้อมูลค่าเฉลี่ย WBGT และวิธีวัดเดิมที่ยืนยันได้",
        );
    }
    const legacyLayout = await this.repo
      .sql(
        "SELECT has_layout FROM legacy_layout_snapshots WHERE revision_id=?",
        source.id,
      )
      .first<{ has_layout: number }>();
    const fileId =
      request.layout?.file_id ??
      (legacyLayout?.has_layout
        ? await this.files.importLegacy(source.id)
        : null);
    if (fileId) await this.files.usable(fileId);
    const payload = this.parse({
      schema_version: 3,
      idempotency_key: request.idempotency_key,
      assessment_type: "environment",
      assessment_group: "environment",
      assessment_category: h.assessment_category,
      inspectionData: request.inspectionData,
      ...(fileId ? { layout: { file_id: fileId } } : {}),
      units: request.units.map((u) => ({
        ...u,
        remark: points.find((p) => p.point_key === u.point_id)?.remark ?? null,
      })),
    }) as EnvironmentSubmissionV3;
    const now = new Date().toISOString(),
      id = crypto.randomUUID(),
      version = h.data_version + 1,
      token = crypto.randomUUID(),
      result = evaluateSubmission(payload),
      summary = this.summary(payload, result);
    const base = {
      revision_id: source.id,
      submission_id: h.id,
      revision_no: source.revision_no,
    } as EnvironmentRevisionV3;
    const revision = this.initialRevision(payload, id, base);
    revision.observations = revision.observations.map((o) => {
      const old = points.find((p) => p.point_key === o.unit.point_id)!;
      return old.is_pass === 1 && o.result.is_pass && old.measured_at
        ? {
            ...o,
            measured_at: old.measured_at,
            observation_kind: "carried" as const,
            carried_from_revision_id: source.id,
          }
        : {
            ...o,
            measured_at: old.measured_at ?? request.inspectionData.start_at,
          };
    });
    const statements = [
      this.repo.precondition(
        token,
        "SELECT COUNT(*)=1 FROM submissions WHERE id=? AND latest_revision_id=? AND data_version=?",
        h.id,
        source.id,
        h.data_version,
      ),
      this.repo.sql(
        "INSERT INTO environment_metadata_supplements(id,submission_id,base_revision_id,supplement_json,created_at) VALUES(?,?,?,?,?)",
        crypto.randomUUID(),
        h.id,
        source.id,
        JSON.stringify(request),
        now,
      ),
      ...this.revisionStatements(
        code,
        revision,
        "correction",
        now,
        request.reason,
      ),
      this.payloadVersion(code, version, "upgrade", payload, result, now),
      this.repo.sql(
        "UPDATE submissions SET schema_version=3,data_version=?,latest_revision_id=?,scoring_version=?,overall_level=?,overall_score=?,has_layout=?,updated_at=? WHERE id=?",
        version,
        id,
        SCORING_VERSION,
        summary.level,
        summary.score,
        fileId ? 1 : 0,
        now,
        h.id,
      ),
      this.repo.sql(
        "INSERT INTO assessment_results(submission_id,assessment_type,assessment_category,result_json,scoring_version,result_origin,is_pass,risk_level,created_at) VALUES(?,'environment',?,?,?,'server-v3',?,?,?) ON CONFLICT(submission_id) DO UPDATE SET result_json=excluded.result_json,scoring_version=excluded.scoring_version,result_origin=excluded.result_origin,is_pass=excluded.is_pass,risk_level=excluded.risk_level,created_at=excluded.created_at",
        h.id,
        h.assessment_category,
        JSON.stringify(result),
        SCORING_VERSION,
        Number(revision.is_pass),
        summary.level,
        now,
      ),
      this.audit(
        h,
        "supplement",
        JSON.parse(source.inspection_snapshot_json),
        request,
        request.reason,
        now,
        id,
      ),
      this.repo.finishCondition(token),
    ];
    if (!request.layout && fileId)
      statements.push(
        this.repo.sql(
          "INSERT INTO legacy_file_mappings(revision_id,file_id,created_at) VALUES(?,?,?)",
          source.id,
          fileId,
          now,
        ),
      );
    const response = {
      id: h.id,
      submission_code: code,
      revision_id: id,
      data_version: version,
      result,
    };
    statements.push(
      this.repo.ledger(
        scope,
        request.idempotency_key,
        hash,
        code,
        response,
        now,
        id,
      ),
    );
    return this.repo.commit(statements, scope, request.idempotency_key, hash);
  }
}
