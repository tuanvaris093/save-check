import { Hono } from "hono";
import type { Env } from "../types";

export const resultsRoute = new Hono<{ Bindings: Env }>();

/**
 * GET /api/results/:code
 * Retrieves complete assessment submission details matching the frontend Result/Review format
 */
resultsRoute.get("/:code", async (c) => {
  const db = c.env.DB;
  const code = c.req.param("code");

  try {
    // 1. Fetch submission header
    const submission = await db
      .prepare(`SELECT * FROM submissions WHERE submission_code = ? OR id = ?`)
      .bind(code, Number(code) || -1)
      .first<any>();

    if (!submission) {
      return c.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `ไม่พบข้อมูลการประเมินรหัส ${code}`,
          },
        },
        404
      );
    }

    const subId = submission.id;
    const result: any = {
      id: submission.id,
      submission_code: submission.submission_code,
      assessment_type: submission.assessment_type,
      assessment_category: submission.assessment_category,
      status: submission.status,
      overall_score: submission.overall_score,
      overall_level: submission.overall_level,
      started_at: submission.started_at,
      completed_at: submission.completed_at,
      created_at: submission.created_at,
      updated_at: submission.updated_at,
      has_layout: !!submission.has_layout,
      layout_file: submission.has_layout
        ? {
            fileName: submission.layout_file_name,
            fileType: submission.layout_file_type,
            fileSize: submission.layout_file_size,
            fileData: submission.layout_file_data,
          }
        : null,
      answers: {},
    };

    // 2. Fetch Environment data
    if (submission.assessment_type === "environment") {
      // Inspection details
      const inspection = await db
        .prepare(`SELECT * FROM environment_inspections WHERE submission_id = ?`)
        .bind(subId)
        .first<any>();

      if (inspection) {
        result.inspectionData = {
          inspector_name: inspection.inspector_name,
          position: inspection.position,
          inspection_location: inspection.inspection_location,
          inspection_date: inspection.inspection_date,
          equipment: inspection.equipment,
          measurement_technique: inspection.measurement_technique,
          start_time: inspection.start_time,
          end_time: inspection.end_time,
        };
      }

      // Measurement points
      const points = await db
        .prepare(
          `SELECT * FROM environment_measurement_points WHERE submission_id = ? ORDER BY point_no ASC`
        )
        .bind(subId)
        .all<any>();

      if (points.results && points.results.length > 0) {
        if (submission.assessment_category === "light") {
          result.answers.light_areas = points.results.map((p: any) => ({
            location_desc: p.location_desc,
            measure: p.measure_value,
            standard_value: p.standard_value,
            remark: p.remark,
          }));
        } else if (submission.assessment_category === "noise") {
          result.answers.standard_value = points.results[0]?.standard_value || 85;
          result.answers.noise_areas = points.results.map((p: any) => ({
            location_desc: p.location_desc,
            min_dBA: p.min_value,
            max_dBA: p.max_value,
            avg_dBA: p.measure_value,
            remark: p.remark,
          }));
        } else if (submission.assessment_category === "heat") {
          result.answers.heat_areas = points.results.map((p: any) => ({
            location_desc: p.location_desc,
            start_time: p.start_time,
            end_time: p.end_time,
            total_time: p.total_time,
            db_temp: p.temp_db,
            wb_temp: p.temp_wb,
            gt_temp: p.temp_gt,
            wbgt_in: p.temp_wbgt,
            wbgt_type: p.wbgt_type,
            workload: p.workload,
            standard_value: p.standard_value,
            wbgt_avg: p.measure_value,
            remark: p.remark,
          }));
        }
      }
    }

    // 3. Fetch Health Risk data
    if (submission.assessment_type === "health_risk") {
      const profile = await db
        .prepare(`SELECT * FROM respondent_profiles WHERE submission_id = ?`)
        .bind(subId)
        .first<any>();

      if (profile) {
        result.profile = {
          full_name: profile.full_name,
          gender: profile.gender,
          age: profile.age,
          weight: profile.weight,
          height: profile.height,
          education_level: profile.education_level,
          marital_status: profile.marital_status,
          has_underlying_disease: !!profile.has_underlying_disease,
          underlying_disease: profile.underlying_disease_details || "ไม่มี",
          underlying_disease_details: profile.underlying_disease_details,
        };
      }

      const workInfo = await db
        .prepare(`SELECT * FROM respondent_work_infos WHERE submission_id = ?`)
        .bind(subId)
        .first<any>();

      if (workInfo) {
        result.workInfo = {
          position_type: workInfo.position_type,
          department: workInfo.department,
          position: workInfo.position,
          work_years: workInfo.work_experience_years,
          work_experience_years: workInfo.work_experience_years,
          work_hours_per_day: workInfo.working_hours_per_day,
          working_hours_per_day: workInfo.working_hours_per_day,
          working_days_per_week: workInfo.working_days_per_week,
          work_area: workInfo.work_area,
        };
      }

      const hrAnswers = await db
        .prepare(
          `SELECT * FROM health_risk_answers WHERE submission_id = ? ORDER BY question_no ASC`
        )
        .bind(subId)
        .all<any>();

      if (hrAnswers.results) {
        for (const ans of hrAnswers.results) {
          result.answers[ans.question_id] = ans.score;
        }
      }
    }

    // 4. Fetch Satisfaction data
    if (submission.assessment_type === "satisfaction") {
      const satAnswers = await db
        .prepare(`SELECT * FROM satisfaction_answers WHERE submission_id = ?`)
        .bind(subId)
        .all<any>();

      if (satAnswers.results) {
        for (const ans of satAnswers.results) {
          result.answers[ans.question_id] = ans.rating;
          if (ans.suggestion) {
            result.answers.suggestion = ans.suggestion;
          }
        }
      }
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("Error fetching result:", err);
    return c.json(
      {
        success: false,
        error: {
          code: "DB_ERROR",
          message: err.message || "Failed to fetch assessment result",
        },
      },
      500
    );
  }
});
