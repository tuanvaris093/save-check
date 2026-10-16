"use client";
import { LayoutAttachmentCard } from "@/components/forms/layout-attachment-card";
import { storedLayoutFile } from "@/lib/v3/layout-file";
import { PageHeader } from "@/components/layout";
import { Button, LoadingState, SubmitLoadingOverlay } from "@/components/ui";
import { StepProgress } from "@/components/assessment";
import { FileUpload, FormInput, FormSelect } from "@/components/forms";
import { useEnvironmentForm } from "@/hooks/use-environment-form";
import { newUnit, type Category, type Mode } from "@/lib/v3/environment-form";
import { UnitEditor } from "./unit-editor";
import { Standards } from "./standards";
import { EnvironmentSummary } from "./environment-summary";
interface Props {
  category: Category;
  mode: Mode;
  code: string | null;
  base: string | null;
}
const metadataLabels: Record<string, string> = {
  inspector_name: "ชื่อ-นามสกุลผู้ตรวจ",
  position: "ตำแหน่ง",
  inspection_location: "สถานที่ตรวจ",
  equipment: "เครื่องมือที่ใช้",
  serial_number: "Serial Number",
  calibration_date: "วันที่ปรับเทียบ",
  responsible_department: "แผนกที่รับผิดชอบ",
  location_responsible_name: "ชื่อผู้รับผิดชอบอาคาร/สถานที่",
  inspection_date: "วันที่ทำการตรวจวัด",
  start_at: "วันเวลาเริ่มตรวจ",
  end_at: "วันเวลาสิ้นสุดตรวจ",
};
const labels = {
  create: "ตรวจวัดครั้งแรก",
  retest: "ประเมินวัดซ้ำ",
  correction: "ประเมินวัดซ้ำ",
  supplement: "เติมข้อมูลประกอบสำหรับการตรวจซ้ำ",
};
export function EnvironmentWizard({ category, mode, code, base }: Props) {
  const {
    clearFieldError,
    loading,
    loadError,
    warning,
    error,
    errors,
    busy,
    redirecting,
    conflict,
    uploading,
    envelope,
    d,
    step,
    alertRef,
    reloadLatest,
    update,
    inspection,
    next,
    prev,
    submit,
    selectLayout,
    preview,
    failed,
  } = useEnvironmentForm({ category, mode, code, base });
  if (loading) return <LoadingState text="กำลังเตรียมแบบตรวจวัด..." />;
  if (loadError || !envelope)
    return (
      <div className="mx-auto max-w-[800px] p-5">
        <PageHeader
          title="เปิดแบบตรวจวัดไม่ได้"
          showBack
          backHref={
            code
              ? `/result?submissionId=${encodeURIComponent(code)}`
              : "/assessment/environment"
          }
        />
        <p role="alert" className="text-danger">
          {loadError}
        </p>
      </div>
    );
  return (
    <div className="app-mobile-shell pb-safe-nav mx-auto flex min-h-dvh w-full max-w-[800px] flex-col min-[1440px]:px-8 min-[1440px]:py-6">
      <PageHeader
        title={`สภาพแวดล้อมด้าน${category === "light" ? "แสงสว่าง" : category === "noise" ? "เสียง" : "ความร้อน"} (${labels[mode]})`}
        subtitle={
          code
            ? `${code}${mode === "retest" ? ` · วัดซ้ำครั้งที่ ${d.source?.revision.revision_no}` : ""}`
            : "กรอกข้อมูลตามขั้นตอน"
        }
        showBack
        className="border-none min-[1440px]:border-none min-[1440px]:bg-transparent min-[1440px]:px-0 min-[1440px]:backdrop-blur-none"
        backHref={
          code
            ? `/result?submissionId=${encodeURIComponent(code)}`
            : "/assessment/environment"
        }
      />
      <main className="min-[1440px]:glass-card flex-1 px-4 py-2 min-[1440px]:mt-4 min-[1440px]:mb-10 min-[1440px]:px-8 min-[1440px]:py-6">
        <StepProgress currentStep={step} totalSteps={3} />
        {warning && <p role="status">{warning}</p>}
        {error && (
          <div
            ref={alertRef}
            tabIndex={-1}
            role="alert"
            className="text-danger my-4 rounded-xl border p-4"
          >
            {error}
          </div>
        )}
        {conflict && (
          <section className="my-4 rounded-xl border p-4">
            <p>
              ร่างฐานเดิมยังเก็บอยู่ การโหลดรอบล่าสุดจะเปิดร่างแยกตามรอบฐานใหม่
            </p>
            <Button disabled={busy} onClick={() => void reloadLatest()}>
              โหลดรอบล่าสุด
            </Button>
          </section>
        )}
        <form
          onChangeCapture={clearFieldError}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 3) next();
            else void submit();
          }}
          className="mt-4 flex flex-col gap-5"
        >
          {step === 1 && (
            <>
              {(mode === "retest" || mode === "supplement") && (
                <p className="text-small">
                  {mode === "retest"
                    ? "ตรวจสอบข้อมูลผู้ตรวจและข้อมูลการตรวจของรอบนี้ แล้วกรอกวันเวลาและค่าตรวจรอบใหม่"
                    : "ยืนยันเฉพาะข้อมูลที่ขาดโดยคงตัวเลขและสถานที่เดิม หากไม่ทราบข้อมูลจริงให้เริ่มงานใหม่"}{" "}
                </p>
              )}
              <section className="form-section-card grid grid-cols-1 gap-4 p-5 min-[1440px]:grid-cols-2">
                <h2 className="text-card-title font-semibold min-[1440px]:col-span-2">
                  ข้อมูลการตรวจ
                </h2>
                {Object.entries(metadataLabels).map(([k, label]) => {
                  const legacyKnown =
                    mode === "supplement" && !!d.source?.inspectionData?.[k];
                  return (
                    <FormInput
                      key={k}
                      name={`inspectionData.${k}`}
                      label={label}
                      required
                      type={
                        k.endsWith("_date")
                          ? "date"
                          : k.endsWith("_at")
                            ? "datetime-local"
                            : "text"
                      }
                      value={d.inspection[k] || ""}
                      disabled={legacyKnown}
                      onChange={(e) => inspection(k, e.target.value)}
                      error={errors[`inspectionData.${k}`]}
                    />
                  );
                })}
                {category === "light" && (
                  <FormSelect
                    name="inspectionData.measurement_technique"
                    label="เทคนิคตรวจแสง"
                    required
                    placeholder="กรุณาเลือกเทคนิคก่อนมาตรฐาน"
                    value={d.inspection.measurement_technique || ""}
                    disabled={mode !== "create" && mode !== "supplement"}
                    options={
                      mode === "supplement"
                        ? [
                            {
                              value: "spot",
                              label: "Spot Measurements (ยืนยันจุดเดิม)",
                            },
                          ]
                        : [
                            { value: "spot", label: "Spot Measurements" },
                            { value: "area", label: "Area Measurement" },
                          ]
                    }
                    error={errors["inspectionData.measurement_technique"]}
                    onChange={(e) =>
                      update({
                        inspection: {
                          ...d.inspection,
                          measurement_technique: e.target.value,
                        },
                        units:
                          mode === "supplement"
                            ? d.units
                            : [newUnit(category, e.target.value)],
                      })
                    }
                  />
                )}
              </section>
              <LayoutAttachmentCard
                value={
                  d.pendingLayout ??
                  storedLayoutFile(
                    d.layout?.file_id,
                    d.layout?.file_id === d.source?.layout?.file_id
                      ? d.source?.layout
                      : d.layout,
                  )
                }
                onChange={selectLayout}
                downloadUrl={
                  !d.pendingLayout
                    ? storedLayoutFile(d.layout?.file_id)?.fileData
                    : undefined
                }
              />
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-card-title font-semibold">
                แบบฟอร์มบันทึกการตรวจวัด (
                {category === "light"
                  ? "แสงสว่าง"
                  : category === "noise"
                    ? "เสียง"
                    : "ความร้อน"}
                )
              </h2>
              <p>
                {mode === "retest"
                  ? "กรอกค่ารอบใหม่เฉพาะหน่วยไม่ผ่าน จุดที่ผ่านแสดงผลเดิมแบบอ่านอย่างเดียว"
                  : "ค่าที่วัดและเกณฑ์ที่ใช้ประเมิน"}
              </p>
              {d.units.map((u, i) => {
                const carry = mode === "retest" && !failed.has(u.point_id),
                  observation =
                    d.source?.schema_version === 3
                      ? d.source.revision.observations.find(
                          (o) => o.unit.point_id === u.point_id,
                        )
                      : undefined;
                return (
                  <div key={u.point_id}>
                    <UnitEditor
                      inspectionDate={d.inspection.inspection_date}
                      unit={u}
                      index={i}
                      mode={mode}
                      carried={carry}
                      errors={errors}
                      onChange={(unit) =>
                        update({
                          units: d.units.map((v, n) => (i === n ? unit : v)),
                        })
                      }
                    />
                    {carry && observation && (
                      <p className="text-caption p-3">
                        วัดจริง {observation.measured_at} · แหล่งรอบ{" "}
                        {observation.carried_from_revision_id || base}
                      </p>
                    )}
                    {mode === "create" && d.units.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          update({ units: d.units.filter((_, n) => i !== n) })
                        }
                      >
                        ลบ{u.kind === "light_area" ? "พื้นที่" : "จุดตรวจ"}{" "}
                        {i + 1}
                      </Button>
                    )}
                  </div>
                );
              })}
              {mode === "create" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    update({
                      units: [
                        ...d.units,
                        newUnit(category, d.inspection.measurement_technique),
                      ],
                    })
                  }
                >
                  เพิ่ม
                  {d.inspection.measurement_technique === "area"
                    ? "พื้นที่"
                    : "จุดตรวจ"}
                </Button>
              )}
            </>
          )}
          {step === 3 && (
            <>
              {preview ? (
                <EnvironmentSummary
                  revision={preview}
                  layoutEditor={
                    <FileUpload
                      value={
                        d.pendingLayout ??
                        storedLayoutFile(
                          d.layout?.file_id,
                          d.layout?.file_id === d.source?.layout?.file_id
                            ? d.source?.layout
                            : d.layout,
                        )
                      }
                      onChange={selectLayout}
                      label=""
                      downloadUrl={
                        !d.pendingLayout
                          ? storedLayoutFile(d.layout?.file_id)?.fileData
                          : undefined
                      }
                    />
                  }
                />
              ) : mode === "supplement" ? (
                <section className="form-section-card p-5">
                  <h3 className="font-semibold">
                    ยืนยันข้อมูลเดิมก่อนเปิดตรวจซ้ำ
                  </h3>
                  <p>ยืนยันข้อมูลประกอบสำหรับการตรวจวัด</p>
                  <p>
                    จำนวนจุดเดิม {d.units.length} จุด ตัวเลขเดิมคงไว้
                    หากข้อมูลที่ยืนยันทำให้เกณฑ์ต่างจากเดิม
                    ระบบจะให้สร้างงานใหม่
                  </p>
                  <dl className="my-4 space-y-2">
                    {Object.entries(d.inspection).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex flex-wrap justify-between gap-2"
                      >
                        <dt>{metadataLabels[key] || "เทคนิคตรวจแสง"}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {d.units.map((unit, index) => (
                    <UnitEditor
                      key={unit.point_id}
                      inspectionDate={d.inspection.inspection_date}
                      unit={unit}
                      index={index}
                      mode="retest"
                      carried={true}
                      errors={{}}
                      onChange={() => {}}
                    />
                  ))}
                </section>
              ) : (
                <p role="alert">ข้อมูลร่างยังไม่ครบ กรุณาย้อนกลับแก้ไข</p>
              )}
              {!preview && mode === "supplement" && (
                <LayoutAttachmentCard
                  value={
                    d.pendingLayout ??
                    storedLayoutFile(
                      d.layout?.file_id,
                      d.layout?.file_id === d.source?.layout?.file_id
                        ? d.source?.layout
                        : d.layout,
                    )
                  }
                  onChange={selectLayout}
                />
              )}
              <Standards
                category={category}
                isPass={preview?.is_pass}
                failedCount={
                  preview?.observations.filter((o) => !o.result.is_pass).length
                }
                isArea={preview?.observations[0]?.unit.kind === "light_area"}
              />
            </>
          )}
          <div className="flex gap-3">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={prev}
              >
                ย้อนกลับ
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              disabled={
                busy ||
                uploading ||
                conflict ||
                (step === 3 && mode !== "supplement" && !preview)
              }
            >
              {step < 3
                ? step === 2
                  ? "ทบทวนก่อนบันทึก"
                  : "ถัดไป"
                : mode === "supplement"
                  ? "ยืนยันและเติมข้อมูล"
                  : "ยืนยันบันทึกผล"}
            </Button>
          </div>
        </form>
      </main>
      <SubmitLoadingOverlay
        isOpen={busy}
        phase={redirecting ? "redirecting" : uploading ? "uploading" : "saving"}
        text="กำลังบันทึกผลการตรวจวัด"
      />
    </div>
  );
}
