import { Hono } from "hono";
import type { Env } from "../types";

export const dashboardRoute = new Hono<{ Bindings: Env }>();

/**
 * GET /api/dashboard/summary
 * Aggregates statistics for the dashboard cards
 */
dashboardRoute.get("/summary", async (c) => {
  const db = c.env.DB;

  try {
    // Total count
    const totalRow = await db
      .prepare(`SELECT COUNT(*) as count FROM submissions`)
      .first<{ count: number }>();
    const total = totalRow?.count || 0;

    // Counts by assessment_type
    const typeRows = await db
      .prepare(
        `SELECT assessment_type, COUNT(*) as count FROM submissions GROUP BY assessment_type`
      )
      .all<{ assessment_type: string; count: number }>();

    const byType: Record<string, number> = {
      environment: 0,
      health_risk: 0,
      satisfaction: 0,
    };
    for (const r of typeRows.results || []) {
      byType[r.assessment_type] = r.count;
    }

    // Counts by assessment_category
    const catRows = await db
      .prepare(
        `SELECT assessment_category, COUNT(*) as count FROM submissions GROUP BY assessment_category`
      )
      .all<{ assessment_category: string; count: number }>();

    const byCategory: Record<string, number> = {
      light: 0,
      noise: 0,
      heat: 0,
      general: 0,
    };
    for (const r of catRows.results || []) {
      byCategory[r.assessment_category] = r.count;
    }

    // Counts by overall_level
    const levelRows = await db
      .prepare(
        `SELECT overall_level, COUNT(*) as count FROM submissions WHERE overall_level IS NOT NULL GROUP BY overall_level`
      )
      .all<{ overall_level: string; count: number }>();

    const byLevel: Record<string, number> = {
      pass: 0,
      medium: 0,
      high_risk: 0,
    };
    for (const r of levelRows.results || []) {
      byLevel[r.overall_level] = r.count;
    }

    // Average satisfaction score
    const satAvgRow = await db
      .prepare(
        `SELECT AVG(overall_score) as avg_score FROM submissions WHERE assessment_type = 'satisfaction' AND overall_score IS NOT NULL`
      )
      .first<{ avg_score: number | null }>();

    const satisfactionAvg = satAvgRow?.avg_score != null
      ? Number(satAvgRow.avg_score.toFixed(2))
      : 0;

    return c.json({
      success: true,
      data: {
        total_submissions: total,
        by_type: byType,
        by_category: byCategory,
        by_level: byLevel,
        satisfaction_avg: satisfactionAvg,
      },
    });
  } catch (err: any) {
    console.error("Dashboard summary error:", err);
    return c.json(
      {
        success: false,
        error: {
          code: "DB_ERROR",
          message: err.message || "Failed to fetch dashboard summary",
        },
      },
      500
    );
  }
});

/**
 * GET /api/dashboard/submissions
 * Retrieves a paginated and filtered list of submissions
 */
dashboardRoute.get("/submissions", async (c) => {
  const db = c.env.DB;
  const url = new URL(c.req.url);

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 10));
  const offset = (page - 1) * limit;

  const typeFilter = url.searchParams.get("type");
  const categoryFilter = url.searchParams.get("category");
  const startDate = url.searchParams.get("start_date")?.trim();
  const endDate = url.searchParams.get("end_date")?.trim();
  const search = url.searchParams.get("search")?.trim();
  const sortOrderParam = (url.searchParams.get("sort_order") || url.searchParams.get("order") || "desc").toLowerCase();
  const sortOrder = sortOrderParam === "asc" ? "ASC" : "DESC";

  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (typeFilter && typeFilter !== "all") {
      conditions.push(`s.assessment_type = ?`);
      params.push(typeFilter);
    }

    if (categoryFilter && categoryFilter !== "all") {
      conditions.push(`s.assessment_category = ?`);
      params.push(categoryFilter);
    }

    if (startDate) {
      conditions.push(`COALESCE(date(s.completed_at), date(s.created_at)) >= date(?)`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`COALESCE(date(s.completed_at), date(s.created_at)) <= date(?)`);
      params.push(endDate);
    }

    if (search) {
      conditions.push(
        `(s.submission_code LIKE ? OR ei.inspector_name LIKE ? OR rp.full_name LIKE ? OR ei.inspection_location LIKE ?)`
      );
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count total query
    const countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM submissions s
      LEFT JOIN environment_inspections ei ON s.id = ei.submission_id
      LEFT JOIN respondent_profiles rp ON s.id = rp.submission_id
      ${whereClause}
    `;

    const countRes = await db
      .prepare(countQuery)
      .bind(...params)
      .first<{ total: number }>();
    const total = countRes?.total || 0;

    // Fetch items query
    const itemsQuery = `
      SELECT 
        s.id,
        s.submission_code,
        s.assessment_type,
        s.assessment_category,
        s.status,
        s.overall_score,
        s.overall_level,
        s.has_layout,
        s.completed_at,
        s.created_at,
        ei.inspector_name,
        ei.inspection_location,
        ei.equipment,
        rp.full_name as profile_name,
        rw.department as profile_department
      FROM submissions s
      LEFT JOIN environment_inspections ei ON s.id = ei.submission_id
      LEFT JOIN respondent_profiles rp ON s.id = rp.submission_id
      LEFT JOIN respondent_work_infos rw ON s.id = rw.submission_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY COALESCE(s.completed_at, s.created_at) ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const itemsRes = await db
      .prepare(itemsQuery)
      .bind(...params, limit, offset)
      .all<any>();

    const items = (itemsRes.results || []).map((row: any) => ({
      id: row.id,
      submission_code: row.submission_code,
      assessment_type: row.assessment_type,
      assessment_category: row.assessment_category,
      status: row.status,
      overall_score: row.overall_score,
      overall_level: row.overall_level,
      has_layout: !!row.has_layout,
      completed_at: row.completed_at || row.created_at,
      created_at: row.created_at,
      inspector_name: row.inspector_name,
      location: row.inspection_location,
      profile_name: row.profile_name,
      department: row.profile_department,
    }));

    return c.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err: any) {
    console.error("Dashboard submissions error:", err);
    return c.json(
      {
        success: false,
        error: {
          code: "DB_ERROR",
          message: err.message || "Failed to fetch dashboard submissions",
        },
      },
      500
    );
  }
});

/**
 * GET /api/dashboard/export-data
 * Retrieves comprehensive multi-table data for Excel Export
 */
dashboardRoute.get("/export-data", async (c) => {
  const db = c.env.DB;
  const url = new URL(c.req.url);

  const typeFilter = url.searchParams.get("type");
  const categoryFilter = url.searchParams.get("category");
  const startDate = url.searchParams.get("start_date")?.trim();
  const endDate = url.searchParams.get("end_date")?.trim();
  const search = url.searchParams.get("search")?.trim();
  const sortOrderParam = (url.searchParams.get("sort_order") || url.searchParams.get("order") || "desc").toLowerCase();
  const sortOrder = sortOrderParam === "asc" ? "ASC" : "DESC";

  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (typeFilter && typeFilter !== "all") {
      conditions.push(`s.assessment_type = ?`);
      params.push(typeFilter);
    }

    if (categoryFilter && categoryFilter !== "all") {
      conditions.push(`s.assessment_category = ?`);
      params.push(categoryFilter);
    }

    if (startDate) {
      conditions.push(`COALESCE(date(s.completed_at), date(s.created_at)) >= date(?)`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`COALESCE(date(s.completed_at), date(s.created_at)) <= date(?)`);
      params.push(endDate);
    }

    if (search) {
      conditions.push(
        `(s.submission_code LIKE ? OR ei.inspector_name LIKE ? OR rp.full_name LIKE ? OR ei.inspection_location LIKE ?)`
      );
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const submissionsQuery = `
      SELECT 
        s.id,
        s.submission_code,
        s.assessment_type,
        s.assessment_category,
        s.status,
        s.overall_score,
        s.overall_level,
        s.has_layout,
        s.completed_at,
        s.created_at,
        ei.inspector_name,
        ei.position as inspector_position,
        ei.inspection_location,
        ei.equipment,
        ei.measurement_technique,
        ei.inspection_date,
        rp.full_name as profile_name,
        rp.gender as profile_gender,
        rp.age as profile_age,
        rp.weight as profile_weight,
        rp.height as profile_height,
        rp.education_level as profile_education,
        rp.marital_status as profile_marital,
        rp.has_underlying_disease,
        rp.underlying_disease_details as profile_disease,
        rw.department as profile_department,
        rw.position as profile_work_position,
        rw.work_experience_years as profile_work_years,
        rw.working_hours_per_day as profile_work_hours,
        rw.working_days_per_week as profile_work_days,
        rw.work_area as profile_work_area
      FROM submissions s
      LEFT JOIN environment_inspections ei ON s.id = ei.submission_id
      LEFT JOIN respondent_profiles rp ON s.id = rp.submission_id
      LEFT JOIN respondent_work_infos rw ON s.id = rw.submission_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY COALESCE(s.completed_at, s.created_at) ${sortOrder}
    `;

    const subRes = await db.prepare(submissionsQuery).bind(...params).all<any>();
    const submissionsList = subRes.results || [];

    if (submissionsList.length === 0) {
      return c.json({
        success: true,
        data: {
          submissions: [],
          envPointsMap: {},
          hrAnswersMap: {},
          satAnswersMap: {},
        },
      });
    }

    // Helper to batch fetch associated data safely below D1's 100 parameter limit
    const CHUNK_SIZE = 50;
    const fetchInBatches = async (
      ids: number[],
      queryFn: (placeholders: string) => string
    ): Promise<any[]> => {
      if (ids.length === 0) return [];
      const batches: number[][] = [];
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        batches.push(ids.slice(i, i + CHUNK_SIZE));
      }

      const batchResults = await Promise.all(
        batches.map((batch) => {
          const placeholders = batch.map(() => "?").join(",");
          return db.prepare(queryFn(placeholders)).bind(...batch).all<any>();
        })
      );

      return batchResults.flatMap((r) => r.results || []);
    };

    // 2. Fetch Environment points
    const envSubIds = submissionsList
      .filter((s: any) => s.assessment_type === "environment")
      .map((s: any) => s.id);

    const envPointsMap: Record<number, any[]> = {};
    if (envSubIds.length > 0) {
      const allPoints = await fetchInBatches(
        envSubIds,
        (placeholders) =>
          `SELECT * FROM environment_measurement_points WHERE submission_id IN (${placeholders}) ORDER BY submission_id, point_no ASC`
      );

      for (const pt of allPoints) {
        if (!envPointsMap[pt.submission_id]) {
          envPointsMap[pt.submission_id] = [];
        }
        envPointsMap[pt.submission_id].push(pt);
      }
    }

    // 3. Fetch Health Risk scores
    const hrSubIds = submissionsList
      .filter((s: any) => s.assessment_type === "health_risk")
      .map((s: any) => s.id);

    const hrAnswersMap: Record<number, any[]> = {};
    if (hrSubIds.length > 0) {
      const allHrAnswers = await fetchInBatches(
        hrSubIds,
        (placeholders) =>
          `SELECT * FROM health_risk_answers WHERE submission_id IN (${placeholders}) ORDER BY submission_id, question_no ASC`
      );

      for (const ans of allHrAnswers) {
        if (!hrAnswersMap[ans.submission_id]) {
          hrAnswersMap[ans.submission_id] = [];
        }
        hrAnswersMap[ans.submission_id].push(ans);
      }
    }

    // 4. Fetch Satisfaction ratings
    const satSubIds = submissionsList
      .filter((s: any) => s.assessment_type === "satisfaction")
      .map((s: any) => s.id);

    const satAnswersMap: Record<number, any[]> = {};
    if (satSubIds.length > 0) {
      const allSatAnswers = await fetchInBatches(
        satSubIds,
        (placeholders) =>
          `SELECT * FROM satisfaction_answers WHERE submission_id IN (${placeholders}) ORDER BY submission_id, id ASC`
      );

      for (const ans of allSatAnswers) {
        if (!satAnswersMap[ans.submission_id]) {
          satAnswersMap[ans.submission_id] = [];
        }
        satAnswersMap[ans.submission_id].push(ans);
      }
    }

    return c.json({
      success: true,
      data: {
        submissions: submissionsList,
        envPointsMap,
        hrAnswersMap,
        satAnswersMap,
      },
    });
  } catch (err: any) {
    console.error("Dashboard export error:", err);
    return c.json(
      {
        success: false,
        error: {
          code: "DB_ERROR",
          message: err.message || "Failed to fetch export data",
        },
      },
      500
    );
  }
});
