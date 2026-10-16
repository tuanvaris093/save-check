"use client";
import { FormInput, FormSelect } from "@/components/forms";
import {
  LIGHT_SPOT_STANDARDS,
  LIGHT_AREA_STANDARDS,
  HEAT_LIMITS,
  surroundingStandard,
  noiseLimit,
  environmentUnitSchema,
  evaluateUnit,
} from "../../../shared/v3";
import { unitFromDraft, type UnitDraft } from "@/lib/v3/environment-form";
interface Props {
  unit: UnitDraft;
  index: number;
  mode: "create" | "retest" | "correction" | "supplement";
  carried: boolean;
  onChange: (u: UnitDraft) => void;
  errors: Record<string, string>;
  inspectionDate?: string;
}
export function UnitEditor({
  unit: u,
  index,
  mode,
  carried,
  onChange,
  errors,
  inspectionDate,
}: Props) {
  const locked = mode === "retest" || carried,
    topology = mode !== "create";
  const change = (key: keyof UnitDraft, value: unknown) =>
    onChange({ ...u, [key]: value });
  const err = (key: string) => errors[`units.${index}.${key}`];
  const numeric = (key: keyof UnitDraft, label: string, disabled = carried) => (
    <FormInput
      name={`units.${index}.${key}`}
      label={label}
      type="number"
      step="any"
      required
      disabled={disabled}
      value={String(u[key] ?? "")}
      onChange={(e) => change(key, e.target.value)}
      error={err(key)}
    />
  );
  const select = (
    key: keyof UnitDraft,
    label: string,
    options: { value: string; label: string }[],
    disabled = locked,
  ) => (
    <FormSelect
      name={`units.${index}.${key}`}
      label={label}
      required
      placeholder="กรุณาเลือก"
      options={options}
      disabled={disabled}
      value={String(u[key] ?? "")}
      onChange={(e) => change(key, e.target.value)}
      error={err(key)}
    />
  );
  const serialized = unitFromDraft(u);
  const parsed = environmentUnitSchema.safeParse(serialized);
  const preview = parsed.success ? evaluateUnit(parsed.data) : null;
  const surrounding =
    u.kind === "light_spot"
      ? surroundingStandard(
          Number(
            (serialized as { standard_target_lux?: number })
              .standard_target_lux,
          ),
        )
      : null;
  return (
    <fieldset
      className="form-section-card flex min-w-0 flex-col gap-4 p-5"
      data-point-id={u.point_id}
    >
      <legend className="font-semibold">
        {u.kind === "light_area" ? "พื้นที่" : "จุดตรวจ"} {index + 1}
        {carried ? " (คงผลเดิม)" : ""}
      </legend>
      <FormInput
        name={`units.${index}.location_desc`}
        label={
          u.kind === "heat" ? "สถานที่ / แผนกตรวจวัด" : "สถานที่ / ลักษณะงาน"
        }
        required
        disabled={locked || mode === "supplement"}
        value={u.location_desc}
        onChange={(e) => change("location_desc", e.target.value)}
        error={err("location_desc")}
      />
      {u.kind === "light_spot" && (
        <>
          <FormSelect
            name={`units.${index}.standard_code`}
            label="มาตรฐานเฉพาะจุด (Spot)"
            required
            placeholder="กรุณาเลือก"
            disabled={topology && mode !== "supplement"}
            value={u.standard_code || ""}
            options={LIGHT_SPOT_STANDARDS.map((s) => ({
              value: s.code,
              label: `${s.max ? `${s.min}–${s.max}` : `≥ ${s.min}`} Lux (${s.label})`,
            }))}
            error={err("standard_code")}
            onChange={(e) => {
              const row = LIGHT_SPOT_STANDARDS.find(
                (s) => s.code === e.target.value,
              )!;
              onChange({
                ...u,
                standard_code: row.code,
                standard_target_lux: row.min,
              });
            }}
          />
          {numeric(
            "lux",
            "ผลการตรวจวัด (Lux)",
            carried || mode === "supplement",
          )}
          {surrounding && (
            <>
              <p className="text-small">
                ตรวจบริเวณโดยรอบด้วย: ใกล้ ≥ {surrounding.near} Lux / ถัดออกไป ≥{" "}
                {surrounding.outer} Lux
              </p>
              {numeric("surrounding_near_lux", "แสงบริเวณโดยรอบใกล้ (Lux)")}
              {numeric(
                "surrounding_outer_lux",
                "แสงบริเวณโดยรอบถัดออกไป (Lux)",
              )}
            </>
          )}
        </>
      )}
      {u.kind === "light_area" && (
        <>
          {select(
            "standard_code",
            "มาตรฐานพื้นที่ (Area)",
            LIGHT_AREA_STANDARDS.map((s) => ({
              value: s.code,
              label: `เฉลี่ย ≥ ${s.averageMin} Lux${s.pointMin == null ? "" : ` / ต่ำสุด ≥ ${s.pointMin} Lux`} (${s.label})`,
            })),
            topology,
          )}
          {numeric(
            "average_lux",
            "ค่าเฉลี่ยของพื้นที่ (Lux)",
            carried || mode === "supplement",
          )}
          {numeric(
            "minimum_lux",
            "ค่าต่ำสุดของพื้นที่ (Lux)",
            carried || mode === "supplement",
          )}
        </>
      )}
      {u.kind === "noise" && (
        <>
          {numeric(
            "min_dBA",
            "ระดับเสียงต่ำสุด (dBA)",
            carried || mode === "supplement",
          )}
          {numeric(
            "max_dBA",
            "ระดับเสียงสูงสุด (dBA)",
            carried || mode === "supplement",
          )}
          {u.evaluation_basis === "exposure-duration" && (
            <>
              {numeric(
                "exposure_duration_minutes",
                "ระยะเวลาสัมผัสเสียง (นาที)",
                topology && mode !== "supplement",
              )}
              {numeric(
                "exposure_level_dBA",
                "ระดับเสียงเฉลี่ย (dBA)",
                carried || mode === "supplement",
              )}
              {Number(u.exposure_duration_minutes) > 0 &&
                Number(u.exposure_duration_minutes) <= 1440 && (
                  <p className="text-small">
                    เกณฑ์ ≤{" "}
                    {noiseLimit(Number(u.exposure_duration_minutes)).limit} dBA
                    ตามระยะเวลา {u.exposure_duration_minutes} นาที
                  </p>
                )}
            </>
          )}
          {u.evaluation_basis === "twa8" && (
            <>
              {numeric(
                "twa_8hr",
                "TWA 8 ชั่วโมง (dBA)",
                carried || mode === "supplement",
              )}
              <p className="text-small">
                เกณฑ์ ≤ 85 dBA ค่านี้ปรับเป็น 8 ชั่วโมงแล้ว
                จึงไม่ปรับตามระยะเวลาซ้ำ
              </p>
            </>
          )}
        </>
      )}
      {u.kind === "heat" &&
        (() => {
          const heatValue = (
            key: "wbgt_average" | "wb_temp" | "gt_temp" | "db_temp",
          ) => {
            if (u[key] !== undefined) return u[key];
            if (key === "wbgt_average")
              return preview?.values.wbgt_average ?? "";
            if (u.intervals?.length === 1)
              return (
                u.intervals[0][
                  { wb_temp: "wb", gt_temp: "gt", db_temp: "db" }[key] as
                    "wb" | "gt" | "db"
                ] ?? ""
              );
            return "";
          };
          const updateHeat = (key: keyof UnitDraft, value: string) => {
            const next = {
              ...u,
              db_temp: heatValue("db_temp"),
              wb_temp: heatValue("wb_temp"),
              gt_temp: heatValue("gt_temp"),
              input_mode: "meter_average" as const,
              intervals: undefined,
              wbgt_average: heatValue("wbgt_average"),
              [key]: value,
            };
            if (key === "workload")
              next.standard_value =
                HEAT_LIMITS[value as keyof typeof HEAT_LIMITS] ?? "";
            if (["wb_temp", "gt_temp", "db_temp", "wbgt_type"].includes(key)) {
              const wb = next.wb_temp ?? heatValue("wb_temp"),
                gt = next.gt_temp ?? heatValue("gt_temp"),
                db = next.db_temp ?? heatValue("db_temp");
              if (
                wb !== "" &&
                gt !== "" &&
                (next.wbgt_type === "in" || db !== "")
              )
                next.wbgt_average = Number(
                  (next.wbgt_type === "out"
                    ? 0.7 * Number(wb) + 0.2 * Number(gt) + 0.1 * Number(db)
                    : 0.7 * Number(wb) + 0.3 * Number(gt)
                  ).toFixed(2),
                );
            }
            if (key === "wbgt_in" && value !== "") next.wbgt_average = value;
            onChange(next);
          };
          const heatInput = (
            key:
              | "db_temp"
              | "wb_temp"
              | "gt_temp"
              | "wbgt_in"
              | "standard_value"
              | "wbgt_average",
            label: string,
            required = false,
          ) => (
            <FormInput
              name={`units.${index}.${key}`}
              label={label}
              type="number"
              step="0.1"
              inputMode="decimal"
              required={required}
              disabled={carried || (key === "standard_value" && topology)}
              value={String(
                key === "standard_value"
                  ? (u.standard_value ??
                      (u.workload ? HEAT_LIMITS[u.workload] : ""))
                  : ["db_temp", "wb_temp", "gt_temp", "wbgt_average"].includes(
                        key,
                      )
                    ? heatValue(
                        key as
                          "db_temp" | "wb_temp" | "gt_temp" | "wbgt_average",
                      )
                    : (u[key] ?? ""),
              )}
              onChange={(e) => updateHeat(key, e.target.value)}
              error={err(key)}
            />
          );
          return (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(["start_at", "end_at"] as const).map((key) => (
                  <FormInput
                    key={key}
                    name={`units.${index}.${key}`}
                    label={
                      key === "start_at"
                        ? "เวลาเริ่มต้น (HH:MM)"
                        : "เวลาสิ้นสุด (HH:MM)"
                    }
                    type="time"
                    required
                    disabled={carried}
                    value={u[key]?.slice(11, 16) || ""}
                    onChange={(e) =>
                      updateHeat(
                        key,
                        e.target.value && inspectionDate
                          ? `${inspectionDate}T${e.target.value}`
                          : "",
                      )
                    }
                    error={err(key)}
                  />
                ))}
              </div>
              <FormSelect
                name={`units.${index}.wbgt_type`}
                label="ประเภทพื้นที่ (WBGT)"
                options={[
                  { value: "in", label: "ในอาคาร (WBGT in)" },
                  { value: "out", label: "นอกอาคาร (WBGT out)" },
                ]}
                value={u.wbgt_type || "in"}
                disabled={topology || carried}
                onChange={(e) => updateHeat("wbgt_type", e.target.value)}
                error={err("wbgt_type")}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {heatInput("db_temp", "อุณหภูมิกระเปาะแห้ง DB (°C)")}
                {heatInput("wb_temp", "อุณหภูมิกระเปาะเปียก WB (°C)")}
                {heatInput("gt_temp", "อุณหภูมิโกลบ GT (°C)")}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {heatInput("wbgt_in", "ค่า WBGT จากเครื่องวัด (°C)")}
                <FormSelect
                  name={`units.${index}.workload`}
                  label="ประเภทงาน"
                  placeholder="เลือกประเภทงาน"
                  required
                  options={[
                    { value: "light", label: "งานเบา" },
                    { value: "moderate", label: "งานปานกลาง" },
                    { value: "heavy", label: "งานหนัก" },
                  ]}
                  value={u.workload || ""}
                  disabled={topology || carried}
                  onChange={(e) => updateHeat("workload", e.target.value)}
                  error={err("workload")}
                />
                {heatInput("standard_value", "มาตรฐาน (°C)", true)}
                {heatInput("wbgt_average", "ค่า WBGT เฉลี่ย (°C)", true)}
              </div>
            </>
          );
        })()}
      <FormInput
        name={`units.${index}.remark`}
        label="หมายเหตุ (ไม่บังคับ)"
        disabled={carried || mode === "supplement"}
        value={u.remark}
        onChange={(e) => change("remark", e.target.value)}
      />
      {preview && (
        <p
          data-unit-preview
          className={preview.is_pass ? "text-success" : "text-danger"}
        >
          {preview.is_pass ? "ผ่าน" : "ไม่ผ่าน"}
        </p>
      )}
    </fieldset>
  );
}
