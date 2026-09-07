import { Hono } from "hono";
import type { Env, CreateSubmissionPayload } from "../types";

export const submissionsRoute = new Hono<{ Bindings: Env }>();

// Helper to generate submission code SUB-YYYYMMDD-XXXX
function generateSubmissionCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `SUB-${year}${month}${day}-${rand}`;
}

/**
 * POST /api/submissions
 * Creates a complete submission record with related inspection, points, profile, answers
 */
submissionsRoute.post("/", async (c) => {
  const db = c.env.DB;
  const body = await c.req.json<CreateSubmissionPayload>();

  if (!body.assessment_type || !body.assessment_category) {
    return c.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "assessment_type and assessment_category are required",
        },
      },
      400
    );
  }

  const submissionCode = body.submission_code || generateSubmissionCode();
  const nowIso = new Date().toISOString();
  const startedAt = body.started_at || nowIso;
  const completedAt = body.completed_at || nowIso;
  const status = body.status || "completed";

  // Check layout
  const layout = body.layout_file;
  const hasLayout = layout ? 1 : 0;
  const layoutFileName = layout?.fileName || null;
  const layoutFileType = layout?.fileType || null;
  const layoutFileSize = layout?.fileSize || null;
  const layoutFileData = layout?.fileData || null;

  try {
    // 1. Insert into submissions
    const insertSub = await db
      .prepare(
        `INSERT INTO submissions (
          submission_code, assessment_type, assessment_category, status,
          overall_score, overall_level, has_layout, layout_file_name,
          layout_file_type, layout_file_size, layout_file_data,
          started_at, completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
      )
      .bind(
        submissionCode,
        body.assessment_type,
        body.assessment_category,
        status,
        body.overall_score ?? null,
        body.overall_level ?? null,
        hasLayout,
        layoutFileName,
        layoutFileType,
        layoutFileSize,
        layoutFileData,
        startedAt,
        completedAt,
        nowIso,
        nowIso
      )
      .first<{ id: number }>();

    if (!insertSub || !insertSub.id) {
      throw new Error("Failed to create submission record");
    }

    const submissionId = insertSub.id;

    // 2. Insert Environment Inspection data if applicable
    if (body.assessment_type === "environment" && body.inspectionData) {
      await db
        .prepare(
          `INSERT INTO environment_inspections (
            submission_id, inspector_name, position, inspection_location,
            inspection_date, equipment, measurement_technique, start_time, end_time, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          submissionId,
          body.inspectionData.inspector_name,
          body.inspectionData.position || "",
          body.inspectionData.inspection_location,
          body.inspectionData.inspection_date,
          body.inspectionData.equipment || "",
          body.inspectionData.measurement_technique || "",
          body.inspectionData.start_time || "",
          body.inspectionData.end_time || "",
          nowIso
        )
        .run();
    }

    // 3. Insert Environment Measurement Points if answers contain points
    if (body.assessment_type === "environment" && body.answers) {
      const ans = body.answers;
      const cat = body.assessment_category;

      if (cat === "light" && Array.isArray(ans.light_areas)) {
        for (let i = 0; i < ans.light_areas.length; i++) {
          const pt = ans.light_areas[i];
          const measure = Number(pt.measure) || 0;
          const std = Number(pt.standard_value) || 0;
          const isPass = measure >= std ? 1 : 0;

          await db
            .prepare(
              `INSERT INTO environment_measurement_points (
                submission_id, category, point_no, location_desc, measure_value,
                standard_value, standard_display, is_pass, remark, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              submissionId,
              "light",
              i + 1,
              pt.location_desc || "-",
              measure,
              std,
              String(std),
              isPass,
              pt.remark || "",
              nowIso
            )
            .run();
        }
      } else if (cat === "noise" && Array.isArray(ans.noise_areas)) {
        const std = Number(ans.standard_value) || 85;
        for (let i = 0; i < ans.noise_areas.length; i++) {
          const pt = ans.noise_areas[i];
          const avg = Number(pt.avg_dBA) || 0;
          const min = Number(pt.min_dBA) || 0;
          const max = Number(pt.max_dBA) || 0;
          const isPass = avg <= std ? 1 : 0;

          await db
            .prepare(
              `INSERT INTO environment_measurement_points (
                submission_id, category, point_no, location_desc, measure_value,
                min_value, max_value, standard_value, standard_display, is_pass, remark, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              submissionId,
              "noise",
              i + 1,
              pt.location_desc || "-",
              avg,
              min,
              max,
              std,
              String(std),
              isPass,
              pt.remark || "",
              nowIso
            )
            .run();
        }
      } else if (cat === "heat" && Array.isArray(ans.heat_areas)) {
        for (let i = 0; i < ans.heat_areas.length; i++) {
          const pt = ans.heat_areas[i];
          const avg = Number(pt.wbgt_avg) || 0;
          const std = Number(pt.standard_value) || 30;
          const isPass = avg <= std ? 1 : 0;

          await db
            .prepare(
              `INSERT INTO environment_measurement_points (
                submission_id, category, point_no, location_desc, measure_value,
                standard_value, standard_display, workload, temp_db, temp_wb, temp_gt,
                temp_wbgt, wbgt_type, start_time, end_time, total_time, is_pass, remark, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              submissionId,
              "heat",
              i + 1,
              pt.location_desc || "-",
              avg,
              std,
              String(std),
              pt.workload || "",
              Number(pt.db_temp) || null,
              Number(pt.wb_temp) || null,
              Number(pt.gt_temp) || null,
              Number(pt.wbgt_in) || null,
              pt.wbgt_type || "in",
              pt.start_time || "",
              pt.end_time || "",
              pt.total_time || "",
              isPass,
              pt.remark || "",
              nowIso
            )
            .run();
        }
      }
    }

    // 4. Insert Profile & WorkInfo for Health Risk
    if (body.profile) {
      await db
        .prepare(
          `INSERT INTO respondent_profiles (
            submission_id, full_name, gender, age, weight, height,
            education_level, marital_status, has_underlying_disease,
            underlying_disease_details, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          submissionId,
          body.profile.full_name || "",
          body.profile.gender || "",
          body.profile.age || null,
          body.profile.weight || null,
          body.profile.height || null,
          body.profile.education_level || null,
          body.profile.marital_status || null,
          body.profile.has_underlying_disease ? 1 : 0,
          body.profile.underlying_disease_details || null,
          nowIso
        )
        .run();
    }

    if (body.workInfo) {
      await db
        .prepare(
          `INSERT INTO respondent_work_infos (
            submission_id, position_type, department, position,
            work_experience_years, working_hours_per_day, working_days_per_week, work_area, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          submissionId,
          body.workInfo.position_type || "",
          body.workInfo.department || "",
          body.workInfo.position || "",
          body.workInfo.work_experience_years || null,
          body.workInfo.working_hours_per_day || null,
          body.workInfo.working_days_per_week || null,
          body.workInfo.work_area || "",
          nowIso
        )
        .run();
    }

    // 5. Insert Health Risk 10 Questions
    if (body.assessment_type === "health_risk" && body.answers) {
      for (let i = 1; i <= 10; i++) {
        const qKey = `q${i}`;
        if (body.answers[qKey] !== undefined) {
          await db
            .prepare(
              `INSERT INTO health_risk_answers (
                submission_id, category, question_id, question_no, score, created_at
              ) VALUES (?, ?, ?, ?, ?, ?)`
            )
            .bind(
              submissionId,
              body.assessment_category,
              qKey,
              i,
              Number(body.answers[qKey]) || 0,
              nowIso
            )
            .run();
        }
      }
    }

    // 6. Insert Satisfaction answers
    if (body.assessment_type === "satisfaction" && body.answers) {
      for (const [key, val] of Object.entries(body.answers)) {
        if (key.startsWith("q")) {
          await db
            .prepare(
              `INSERT INTO satisfaction_answers (
                submission_id, question_id, rating, suggestion, created_at
              ) VALUES (?, ?, ?, ?, ?)`
            )
            .bind(
              submissionId,
              key,
              Number(val) || 0,
              body.answers.suggestion || null,
              nowIso
            )
            .run();
        }
      }
    }

    return c.json({
      success: true,
      data: {
        id: submissionId,
        submission_code: submissionCode,
        message: "บันทึกข้อมูลการประเมินเรียบร้อยแล้ว",
      },
    });
  } catch (err: any) {
    console.error("Error creating submission:", err);
    return c.json(
      {
        success: false,
        error: {
          code: "DB_ERROR",
          message: err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล",
        },
      },
      500
    );
  }
});

/**
 * PATCH /api/submissions/:code/layout
 * Update or remove room layout file for an existing submission
 */
submissionsRoute.patch("/:code/layout", async (c) => {
  const db = c.env.DB;
  const code = c.req.param("code");
  const body = await c.req.json<{
    layout_file: {
      fileName: string;
      fileType: string;
      fileSize: number;
      fileData: string;
    } | null;
  }>();

  const nowIso = new Date().toISOString();
  const file = body.layout_file;
  const hasLayout = file ? 1 : 0;

  try {
    const res = await db
      .prepare(
        `UPDATE submissions
         SET has_layout = ?,
             layout_file_name = ?,
             layout_file_type = ?,
             layout_file_size = ?,
             layout_file_data = ?,
             updated_at = ?
         WHERE submission_code = ?`
      )
      .bind(
        hasLayout,
        file?.fileName || null,
        file?.fileType || null,
        file?.fileSize || null,
        file?.fileData || null,
        nowIso,
        code
      )
      .run();

    if (!res.meta.changes) {
      return c.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `ไม่พบเอกสารรหัส ${code}`,
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        submission_code: code,
        has_layout: !!file,
        message: file ? "อัปเดตไฟล์ผังห้องเรียบร้อยแล้ว" : "ลบไฟล์ผังห้องเรียบร้อยแล้ว",
      },
    });
  } catch (err: any) {
    return c.json(
      {
        success: false,
        error: {
          code: "DB_ERROR",
          message: err.message || "Failed to update layout file",
        },
      },
      500
    );
  }
});
