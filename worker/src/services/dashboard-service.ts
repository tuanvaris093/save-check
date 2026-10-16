import { AssessmentRepository } from "../repositories/assessment-repository";
import { fail } from "../lib/errors";
import { satisfactionQuestionnaireVersion } from "../../../shared/v3";
export class DashboardService {
  constructor(readonly repo: AssessmentRepository) {}
  dateColumn(url: URL) {
    const basis = url.searchParams.get("date_basis") ?? "created";
    if (!["latest_measurement", "created"].includes(basis))
      fail(400, "FILTER_VALUE", "เลือกวันตรวจล่าสุดหรือวันสร้างงาน");
    return basis === "created"
      ? "s.created_at"
      : "COALESCE(s.latest_measured_at,s.completed_at,s.created_at)";
  }
  filters(url: URL) {
    const dateColumn = this.dateColumn(url);
    const where: string[] = [
        "s.schema_version=3",
        "s.assessment_group IN ('environment','health')",
        "(s.assessment_type<>'satisfaction' OR s.questionnaire_version=CASE s.assessment_group WHEN 'environment' THEN ? ELSE ? END)",
      ],
      args: unknown[] = [
        satisfactionQuestionnaireVersion("environment"),
        satisfactionQuestionnaireVersion("health"),
      ];
    const enums: { key: string; column: string; values: string[] }[] = [
      {
        key: "type",
        column: "s.assessment_type",
        values: ["environment", "health_risk", "satisfaction"],
      },
      {
        key: "category",
        column: "s.assessment_category",
        values: ["light", "noise", "heat", "general"],
      },
      {
        key: "group",
        // Dashboard's top-level type includes assessments and satisfaction in this group.
        column: "s.assessment_group",
        values: ["environment", "health"],
      },
    ];
    for (const f of enums) {
      const v = url.searchParams.get(f.key);
      if (v && v !== "all") {
        if (!f.values.includes(v))
          fail(400, "FILTER_VALUE", "ตัวกรองไม่ถูกต้อง");
        where.push(`${f.column}=?`);
        args.push(v);
      }
    }
    const archived = url.searchParams.get("archived") ?? "active";
    if (!["active", "only", "all"].includes(archived))
      fail(400, "FILTER_VALUE", "ตัวกรองคลังไม่ถูกต้อง");
    // Archiving is retired; historical flags must not hide saved assessments.
    for (const [key, op] of [
      ["start_date", ">="],
      ["end_date", "<="],
    ] as const) {
      const v = url.searchParams.get(key);
      if (v) {
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
          Number.isNaN(Date.parse(v)) ||
          new Date(v).toISOString().slice(0, 10) !== v
        )
          fail(400, "FILTER_DATE", "วันที่ไม่ถูกต้อง");
        where.push(`date(${dateColumn},'+7 hours')${op}date(?)`);
        args.push(v);
      }
    }
    const start = url.searchParams.get("start_date"),
      end = url.searchParams.get("end_date");
    if (start && end && start > end)
      fail(400, "FILTER_DATE", "วันที่เริ่มต้องไม่หลังวันสิ้นสุด");
    const code = url.searchParams.get("submission_code");
    if (code) {
      if (code.length > 100) fail(400, "FILTER_VALUE", "รหัสงานยาวเกินไป");
      where.push("s.submission_code=?");
      args.push(code);
    }
    const search = url.searchParams.get("search")?.trim();
    if (search) {
      if (search.length > 100) fail(400, "FILTER_VALUE", "คำค้นยาวเกินไป");
      where.push(
        "(s.submission_code LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' OR location LIKE ? ESCAPE '\\')",
      );
      const pattern = "%" + search.replace(/[\\%_]/g, (v) => "\\" + v) + "%";
      args.push(pattern, pattern, pattern);
    }
    return { where: where.length ? "WHERE " + where.join(" AND ") : "", args };
  }
  base() {
    return `WITH listings AS (SELECT s.*,r.measured_at latest_measured_at,r.kind latest_revision_kind,r.is_pass latest_is_pass,COALESCE(json_extract(r.inspection_snapshot_json,'$.inspector_name'),(SELECT full_name FROM respondent_profiles WHERE submission_id=s.id ORDER BY id LIMIT 1),(SELECT inspector_name FROM environment_inspections WHERE submission_id=s.id ORDER BY id LIMIT 1)) name,COALESCE(json_extract(r.inspection_snapshot_json,'$.inspection_location'),(SELECT inspection_location FROM environment_inspections WHERE submission_id=s.id ORDER BY id LIMIT 1)) location,(SELECT COUNT(*) FROM environment_revisions WHERE submission_id=s.id AND status='finalized' AND schema_version=3) revision_count FROM submissions s LEFT JOIN environment_revisions r ON r.id=s.latest_revision_id) `;
  }
  pagination(url: URL, max = 100) {
    const page = Number(url.searchParams.get("page") ?? 1),
      limit = Number(url.searchParams.get("limit") ?? 20);
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 1000000 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > max
    )
      fail(400, "PAGINATION", "เลขหน้าหรือจำนวนรายการไม่ถูกต้อง");
    return { page, limit };
  }
  async list(url: URL) {
    const { page, limit } = this.pagination(url),
      { where, args } = this.filters(url),
      sort =
        url.searchParams.get("sort_order") ??
        url.searchParams.get("order") ??
        "desc";
    if (!["asc", "desc"].includes(sort))
      fail(400, "SORT", "การเรียงไม่ถูกต้อง");
    const items = await this.repo
      .sql(
        this.base() +
          `SELECT id,submission_code,assessment_type,assessment_category,assessment_group,schema_version,data_version,overall_score,overall_level,has_layout,created_at,completed_at,archived_at,latest_revision_id,latest_measured_at,latest_revision_kind,latest_is_pass,name,location,revision_count FROM listings s ${where} ORDER BY julianday(s.created_at) ${sort === "asc" ? "ASC" : "DESC"},id ${sort === "asc" ? "ASC" : "DESC"} LIMIT ? OFFSET ?`,
        ...args,
        limit,
        (page - 1) * limit,
      )
      .all<
        Record<string, unknown> & {
          submission_code: string;
          assessment_type: string;
        }
      >();
    const total = await this.repo
      .sql(
        this.base() + `SELECT COUNT(*) total FROM listings s ${where}`,
        ...args,
      )
      .first<{ total: number }>();
    return {
      items: items.results.map((r) => ({
        ...r,
        display_name: r.name,
        inspector_name: r.name,
        profile_name: r.name,
        inspection_location: r.location,
      })),
      total: total?.total ?? 0,
      page,
      limit,
      total_pages: Math.ceil((total?.total ?? 0) / limit),
    };
  }
  async summary(url: URL) {
    const { where, args } = this.filters(url);
    const rows = (
      await this.repo
        .sql(
          this.base() +
            `SELECT assessment_type,assessment_category,assessment_group,overall_level,COUNT(*) count,SUM(revision_count) revisions,SUM(CASE WHEN assessment_type='satisfaction' THEN overall_score ELSE NULL END) score_sum,COUNT(CASE WHEN assessment_type='satisfaction' THEN overall_score ELSE NULL END) score_count FROM listings s ${where} GROUP BY assessment_type,assessment_category,assessment_group,overall_level`,
          ...args,
        )
        .all<{
          assessment_type: string;
          assessment_category: string;
          assessment_group: string;
          overall_level: string | null;
          count: number;
          revisions: number;
          score_sum: number | null;
          score_count: number;
        }>()
    ).results;
    const by_type: Record<string, number> = {
        environment: 0,
        health_risk: 0,
        satisfaction: 0,
      },
      by_category: Record<string, number> = {
        light: 0,
        noise: 0,
        heat: 0,
        general: 0,
      },
      by_level: Record<string, number> = { pass: 0, medium: 0, high_risk: 0 },
      by_group: Record<string, number> = {
        environment: 0,
        health: 0,
      },
      scores: Record<string, { sum: number; count: number }> = {
        environment: { sum: 0, count: 0 },
        health: { sum: 0, count: 0 },
      };
    const by_form: Record<string, number> = {};
    let total = 0,
      totalRevisions = 0,
      scoreSum = 0,
      scoreCount = 0;
    for (const r of rows) {
      total += r.count;
      const form = `${r.assessment_type}:${r.assessment_group}:${r.assessment_category}`;
      by_form[form] = (by_form[form] ?? 0) + r.count;
      totalRevisions += r.revisions;
      by_type[r.assessment_type] = (by_type[r.assessment_type] ?? 0) + r.count;
      by_category[r.assessment_category] =
        (by_category[r.assessment_category] ?? 0) + r.count;
      by_group[r.assessment_group] =
        (by_group[r.assessment_group] ?? 0) + r.count;
      if (r.overall_level)
        by_level[r.overall_level] = (by_level[r.overall_level] ?? 0) + r.count;
      if (r.assessment_type === "satisfaction") {
        scores[r.assessment_group].sum += r.score_sum ?? 0;
        scores[r.assessment_group].count += r.score_count;
        scoreSum += r.score_sum ?? 0;
        scoreCount += r.score_count;
      }
    }
    const averages = Object.fromEntries(
      Object.entries(scores).map(([g, v]) => [
        g,
        v.count ? v.sum / v.count : null,
      ]),
    );
    const dimensions = (
      await this.repo
        .sql(
          this.base() +
            `SELECT s.assessment_group, ${[0, 1, 2, 3].map((i) => `AVG(json_extract(p.result_json,'$.dimension_means[${i}]')) d${i}`).join(",")}
       FROM listings s JOIN submission_payload_versions p ON p.submission_id=s.id AND p.version_no=s.data_version
       ${where} AND s.assessment_type='satisfaction' GROUP BY s.assessment_group`,
          ...args,
        )
        .all<{
          assessment_group: string;
          d0: number | null;
          d1: number | null;
          d2: number | null;
          d3: number | null;
        }>()
    ).results;
    return {
      total_submissions: total,
      by_type,
      by_category,
      by_level,
      by_group,
      total_environment_revisions: totalRevisions,
      satisfaction_avg: scoreCount ? scoreSum / scoreCount : 0,
      satisfaction_avg_by_group: averages,
      by_form,
      satisfaction_dimensions_by_group: Object.fromEntries(
        dimensions.map((r) => [r.assessment_group, [r.d0, r.d1, r.d2, r.d3]]),
      ),
    };
  }
  async export(url: URL) {
    const scope = url.searchParams.get("revision_scope") ?? "latest";
    if (!["latest", "history"].includes(scope))
      fail(400, "REVISION_SCOPE", "เลือก latest หรือ history");
    const revisionPage = Number(url.searchParams.get("revision_page") ?? 1),
      revisionLimit = Number(url.searchParams.get("revision_limit") ?? 10);
    if (
      !Number.isSafeInteger(revisionPage) ||
      revisionPage < 1 ||
      revisionPage > 1000000 ||
      !Number.isSafeInteger(revisionLimit) ||
      revisionLimit < 1 ||
      revisionLimit > 100
    )
      fail(400, "PAGINATION", "เลขหน้ารอบตรวจหรือจำนวนรอบไม่ถูกต้อง");
    // Bound each response to at most 100 records, including historical revisions.
    const listUrl = new URL(url);
    if (scope === "history")
      listUrl.searchParams.set(
        "limit",
        String(
          Math.min(this.pagination(url).limit, Math.floor(100 / revisionLimit)),
        ),
      );
    const list = await this.list(listUrl),
      records: Awaited<ReturnType<AssessmentRepository["result"]>>[] = [],
      revisionPages = [];
    let recordBytes = 2;
    const appendRecord = (
      record: Awaited<ReturnType<AssessmentRepository["result"]>>,
    ) => {
      recordBytes +=
        new TextEncoder().encode(JSON.stringify(record)).byteLength + 1;
      if (recordBytes > 4 * 1024 * 1024)
        fail(
          413,
          "EXPORT_PAGE_TOO_LARGE",
          "ข้อมูลส่งออกหน้านี้ใหญ่เกินไป กรุณาลดจำนวนงานหรือรอบต่อหน้า",
        );
      records.push(record);
    };
    for (const item of list.items) {
      const code = String(item.submission_code);
      if (scope === "history" && item.assessment_type === "environment") {
        const h = await this.repo.header(code),
          history = await this.repo.history(
            h,
            revisionPage,
            revisionLimit,
            true,
          );
        for (const r of history.items)
          appendRecord(await this.repo.result(code, String(r.id)));
        revisionPages.push({
          submission_code: code,
          total: history.total,
          page: revisionPage,
          limit: revisionLimit,
          next_page:
            revisionPage * revisionLimit < history.total
              ? revisionPage + 1
              : null,
        });
      } else appendRecord(await this.repo.result(code));
    }
    return {
      ...list,
      revision_scope: scope,
      records,
      revision_pages: revisionPages,
      next_page: list.page * list.limit < list.total ? list.page + 1 : null,
    };
  }
}
