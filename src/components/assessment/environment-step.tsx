"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  environmentMeasurementSchema,
  type EnvironmentMeasurementFormValues,
  getEnvironmentStandards,
  LIGHT_POINT_STANDARDS,
  HEAT_WORKLOADS,
  HEAT_STANDARDS,
  NOISE_STANDARDS,
  calculateAverage,
} from "@/lib/environment-schema";
import { FormInput, FormSelect } from "@/components/forms";
import { Button } from "@/components/ui";
import type { AssessmentCategory } from "@/types";
import { ASSESSMENT_CATEGORY_LABELS } from "@/lib/constants";
import { PlusCircle, Trash2 } from "lucide-react";

interface EnvironmentStepProps {
  category: AssessmentCategory;
  defaultValues?: Partial<EnvironmentMeasurementFormValues>;
  onNext: (data: EnvironmentMeasurementFormValues) => void;
  onPrev: () => void;
}

export function EnvironmentStep({
  category,
  defaultValues,
  onNext,
  onPrev,
}: EnvironmentStepProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
    setValue,
    getValues,
  } = useForm<EnvironmentMeasurementFormValues>({
    resolver: zodResolver(environmentMeasurementSchema) as any,
    defaultValues: {
      environment_condition: "",
      job_characteristic: "",
      workload_level: undefined,
      standard_value: undefined,
      measure_1: undefined,
      measure_2: undefined,
      measure_3: undefined,
      working_duration: "",
      twa_8hr: undefined,
      noise_areas:
        category === "noise"
          ? [
              {
                location_desc: "",
                min_dBA: undefined as any,
                max_dBA: undefined as any,
                avg_dBA: undefined as any,
                remark: "",
              },
            ]
          : [],
      heat_areas:
        category === "heat"
          ? [
              {
                location_desc: "",
                start_time: "",
                end_time: "",
                db_temp: undefined as any,
                wb_temp: undefined as any,
                gt_temp: undefined as any,
                wbgt_in: undefined as any,
                wbgt_type: "in" as const,
                workload: "",
                wbgt_avg: undefined as any,
                remark: "",
              },
            ]
          : [],
      light_areas:
        category === "light"
          ? [
              {
                location_desc: "",
                standard_value: 300,
                measure: undefined as any,
                remark: "",
              },
            ]
          : [],
      ...defaultValues,
    } as any,
    mode: "onTouched",
  });

  const {
    fields: noiseFields,
    append: appendNoise,
    remove: removeNoise,
  } = useFieldArray({
    control,
    name: "noise_areas" as never,
  });

  const {
    fields: heatFields,
    append: appendHeat,
    remove: removeHeat,
  } = useFieldArray({
    control,
    name: "heat_areas" as never,
  });

  const {
    fields: lightFields,
    append: appendLight,
    remove: removeLight,
  } = useFieldArray({
    control,
    name: "light_areas" as never,
  });

  const [average, setAverage] = useState<number | null>(null);

  const watchedLightAreas = watch("light_areas");
  const heatErrors = errors.heat_areas as any;

  const standards = getEnvironmentStandards(category);

  useEffect(() => {
    if (category !== "light" && standards.length === 1) {
      setValue("standard_value", standards[0].value, { shouldValidate: true });
    }
  }, [standards, setValue, category]);

  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      const mergedDefaults = { ...defaultValues };
      if (category === "noise") {
        if (
          !mergedDefaults.noise_areas ||
          mergedDefaults.noise_areas.length === 0
        ) {
          mergedDefaults.noise_areas = [
            {
              location_desc: "",
              min_dBA: undefined as any,
              max_dBA: undefined as any,
              avg_dBA: undefined as any,
              remark: "",
            },
          ];
        }
        mergedDefaults.light_areas = [];
      } else if (category === "light") {
        if (
          !mergedDefaults.light_areas ||
          mergedDefaults.light_areas.length === 0
        ) {
          mergedDefaults.light_areas = [
            {
              location_desc: "",
              standard_value: 300,
              measure: undefined as any,
              remark: "",
            },
          ];
        }
        mergedDefaults.noise_areas = [];
      } else if (category === "heat") {
        if (
          !mergedDefaults.heat_areas ||
          mergedDefaults.heat_areas.length === 0
        ) {
          mergedDefaults.heat_areas = [
            {
              location_desc: "",
              start_time: "",
              end_time: "",
              db_temp: undefined as any,
              wb_temp: undefined as any,
              gt_temp: undefined as any,
              wbgt_in: undefined as any,
              wbgt_type: "in" as const,
              workload: "",
              wbgt_avg: undefined as any,
              standard_value: undefined as any,
              remark: "",
            },
          ];
        }
        mergedDefaults.noise_areas = [];
        mergedDefaults.light_areas = [];
      } else {
        mergedDefaults.noise_areas = [];
        mergedDefaults.light_areas = [];
        mergedDefaults.heat_areas = [];
      }
      reset((prev) => ({ ...prev, ...mergedDefaults }));
    }
  }, [defaultValues, reset, category]);

  useEffect(() => {
    if (category === "light" && watchedLightAreas) {
      const vals = watchedLightAreas
        .map((a: any) => a?.measure)
        .filter(
          (v: any) =>
            v !== undefined && v !== "" && v !== null && !isNaN(Number(v))
        );
      if (vals.length > 0) {
        const sum = vals.reduce(
          (acc: number, curr: number) => acc + Number(curr),
          0
        );
        setAverage(Number((sum / vals.length).toFixed(2)));
      } else {
        setAverage(null);
      }
    } else {
      setAverage(null);
    }
  }, [category, watchedLightAreas]);

  const unitLabel =
    category === "light" ? "Lux" : category === "noise" ? "dBA" : "°C";

  const noiseErrors = errors.noise_areas as any;
  const lightErrors = errors.light_areas as any;

  const calculateAndSetWBGT = (index: number, newType?: string) => {
    const currentValues = getValues(`heat_areas.${index}` as never) as any;
    const currentType = newType || currentValues?.wbgt_type || "in";
    const db = Number(currentValues?.db_temp);
    const wb = Number(currentValues?.wb_temp);
    const gt = Number(currentValues?.gt_temp);

    if (wb && gt && !isNaN(wb) && !isNaN(gt)) {
      let calculated = 0;
      if (currentType === "in") {
        calculated = 0.7 * wb + 0.3 * gt;
      } else if (currentType === "out" && db && !isNaN(db)) {
        calculated = 0.7 * wb + 0.2 * gt + 0.1 * db;
      }

      if (calculated > 0) {
        setValue(
          `heat_areas.${index}.wbgt_avg` as never,
          Number(calculated.toFixed(1)) as never,
          { shouldValidate: true }
        );
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onNext)}
      className="flex flex-col gap-6 animate-fade-in"
      noValidate
    >
      {category === "noise" && (
        <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
          <h3 className="mb-4 text-card-title font-semibold text-text-primary">
            แบบฟอร์มบันทึกการตรวจวัด ({ASSESSMENT_CATEGORY_LABELS[category]})
          </h3>
          <div className="flex flex-col gap-4">
            <Controller
              name="standard_value"
              control={control}
              render={({ field }) => (
                <FormSelect
                  label={`มาตรฐาน (${unitLabel})`}
                  placeholder="-- เลือกมาตรฐาน --"
                  options={standards.map((std) => ({
                    value: std.value.toString(),
                    label: std.label,
                  }))}
                  required
                  {...field}
                  value={field.value !== undefined ? field.value.toString() : ""}
                  error={errors.standard_value?.message}
                />
              )}
            />
          </div>
        </div>
      )}

      <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
        <h3 className="mb-4 text-card-title font-semibold text-text-primary flex items-center justify-between">
          <span>ค่าที่ตรวจวัดได้ ({unitLabel})</span>
          {category !== "noise" && average !== null && (
            <span className="text-small font-normal text-primary bg-primary-soft px-3 py-1 rounded-full">
              ค่าเฉลี่ย: {average} {unitLabel}
            </span>
          )}
        </h3>

        {category === "noise" && (
          <div className="flex flex-col gap-6">
            <p className="text-caption text-text-secondary -mt-2">
              ระบุสถานที่/ลักษณะงาน ระดับเสียงต่ำสุด สูงสุด เฉลี่ย และเลือกมาตรฐานเฉพาะจุด
            </p>

            <div className="flex flex-col gap-4">
              {noiseFields.map((field, index) => (
                <div
                  key={field.id}
                  className="relative grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-10 border border-border rounded-lg bg-background shadow-sm animate-scale-in"
                >
                  <div className="absolute top-3 left-4 text-small font-semibold text-text-primary">
                    จุดตรวจที่ {index + 1}
                  </div>
                  {noiseFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeNoise(index)}
                      className="absolute top-2 right-2 text-danger hover:text-danger-hover p-1.5 rounded-full hover:bg-danger-soft transition-colors"
                      title="ลบจุดตรวจ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  <FormInput
                    label="สถานที่ / ลักษณะงาน"
                    placeholder="เช่น โซนเครื่องจักร"
                    required
                    {...register(`noise_areas.${index}.location_desc` as never)}
                    error={noiseErrors?.[index]?.location_desc?.message}
                  />

                  <FormInput
                    label="ระดับเสียงต่ำสุด (dBA)"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="ระบุค่าต่ำสุด"
                    required
                    {...register(`noise_areas.${index}.min_dBA` as never)}
                    error={noiseErrors?.[index]?.min_dBA?.message}
                  />

                  <FormInput
                    label="ระดับเสียงสูงสุด (dBA)"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="ระบุค่าสูงสุด"
                    required
                    {...register(`noise_areas.${index}.max_dBA` as never)}
                    error={noiseErrors?.[index]?.max_dBA?.message}
                  />
                  
                  <FormInput
                    label="ระดับเสียงเฉลี่ย (dBA)"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="ระบุค่าเฉลี่ย"
                    required
                    {...register(`noise_areas.${index}.avg_dBA` as never)}
                    error={noiseErrors?.[index]?.avg_dBA?.message}
                  />

                  <FormInput
                    label="หมายเหตุ"
                    placeholder="เช่น ข้อมูลเพิ่มเติม (ถ้ามี)"
                    {...register(`noise_areas.${index}.remark` as never)}
                    error={noiseErrors?.[index]?.remark?.message}
                  />
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-2 py-6 flex items-center justify-center gap-2 text-text-secondary hover:text-primary hover:border-primary hover:bg-primary-soft/30 transition-all"
              onClick={() =>
                appendNoise({
                  location_desc: "",
                  min_dBA: undefined as any,
                  max_dBA: undefined as any,
                  avg_dBA: undefined as any,
                  remark: "",
                } as never)
              }
            >
              <PlusCircle className="h-5 w-5" />
              เพิ่มจุดตรวจ
            </Button>
            
            <div className="mt-4 pt-4 border-t border-border">
              <FormInput
                label="ระดับเสียงเฉลี่ย TWA 8 ชั่วโมง (dBA)"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="ระบุค่า TWA สุทธิภาพรวม"
                required
                {...register("twa_8hr")}
                error={errors.twa_8hr?.message}
              />
              <p className="text-caption text-text-secondary mt-1">
                ผลประเมินรวมจะยึดจากค่า TWA 8 ชั่วโมง เพื่อเทียบกับมาตรฐานภาพรวม
              </p>
            </div>
          </div>
        )}

        {category === "light" && (
          <div className="flex flex-col gap-6">
            <p className="text-caption text-text-secondary -mt-2">
              ระบุสถานที่/ลักษณะงาน ค่ามาตรฐานเฉพาะจุด และค่าความสว่างที่วัดได้
            </p>

            <div className="flex flex-col gap-4">
              {lightFields.map((field, index) => (
                <div
                  key={field.id}
                  className="relative grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-10 border border-border rounded-lg bg-background shadow-sm animate-scale-in"
                >
                  <div className="absolute top-3 left-4 text-small font-semibold text-text-primary">
                    จุดตรวจที่ {index + 1}
                  </div>
                  {lightFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLight(index)}
                      className="absolute top-2 right-2 text-danger hover:text-danger-hover p-1.5 rounded-full hover:bg-danger-soft transition-colors"
                      title="ลบจุดตรวจ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  <FormInput
                    label="สถานที่ / ลักษณะงาน"
                    placeholder="เช่น โต๊ะปฏิบัติงานหน้าคอม"
                    required
                    {...register(`light_areas.${index}.location_desc` as never)}
                    error={lightErrors?.[index]?.location_desc?.message}
                  />

                  <Controller
                    name={`light_areas.${index}.standard_value` as never}
                    control={control}
                    render={({ field: selectField }) => (
                      <FormSelect
                        label="ค่ามาตรฐาน (Lux)"
                        placeholder="-- เลือกมาตรฐานเฉพาะจุด --"
                        options={LIGHT_POINT_STANDARDS.map((std) => ({
                          value: std.value.toString(),
                          label: std.label,
                        }))}
                        required
                        {...selectField}
                        value={
                          selectField.value !== undefined && selectField.value !== null
                            ? String(selectField.value)
                            : ""
                        }
                        error={lightErrors?.[index]?.standard_value?.message}
                      />
                    )}
                  />

                  <FormInput
                    label={`ผลการตรวจวัด (${unitLabel})`}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder={`ระบุค่า ${unitLabel}`}
                    required
                    {...register(`light_areas.${index}.measure` as never)}
                    error={lightErrors?.[index]?.measure?.message}
                  />

                  <FormInput
                    label="หมายเหตุ"
                    placeholder="เช่น ระบุข้อมูลเพิ่มเติม (ถ้ามี)"
                    {...register(`light_areas.${index}.remark` as never)}
                    error={lightErrors?.[index]?.remark?.message}
                  />
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-2 py-6 flex items-center justify-center gap-2 text-text-secondary hover:text-primary hover:border-primary hover:bg-primary-soft/30 transition-all"
              onClick={() =>
                appendLight({
                  location_desc: "",
                  standard_value: 300,
                  measure: undefined as any,
                  remark: "",
                } as never)
              }
            >
              <PlusCircle className="h-5 w-5" />
              เพิ่มจุดตรวจ
            </Button>
          </div>
        )}

        {category === "heat" && (
          <div className="flex flex-col gap-6">
            <p className="text-caption text-text-secondary -mt-2">
              ระบุข้อมูลการตรวจวัดความร้อน ค่า WBGT และระดับภาระงานในแต่ละจุด
            </p>

            <div className="flex flex-col gap-4">
              {heatFields.map((field, index) => (
                <div
                  key={field.id}
                  className="relative flex flex-col gap-4 p-4 pt-10 border border-border rounded-lg bg-background shadow-sm animate-scale-in"
                >
                  <div className="absolute top-3 left-4 text-small font-semibold text-text-primary">
                    จุดตรวจที่ {index + 1}
                  </div>
                  {heatFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHeat(index)}
                      className="absolute top-2 right-2 text-danger hover:text-danger-hover p-1.5 rounded-full hover:bg-danger-soft transition-colors"
                      title="ลบจุดตรวจ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  <FormInput
                    label="สถานที่ / แผนกตรวจวัด"
                    placeholder="เช่น โรงซักฟอก"
                    required
                    {...register(`heat_areas.${index}.location_desc` as never)}
                    error={heatErrors?.[index]?.location_desc?.message}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="เวลาเริ่มต้น (HH:MM)"
                      type="time"
                      required
                      {...register(`heat_areas.${index}.start_time` as never)}
                      error={heatErrors?.[index]?.start_time?.message}
                    />
                    <FormInput
                      label="เวลาสิ้นสุด (HH:MM)"
                      type="time"
                      required
                      {...register(`heat_areas.${index}.end_time` as never)}
                      error={heatErrors?.[index]?.end_time?.message}
                    />
                  </div>

                    <Controller
                      name={`heat_areas.${index}.wbgt_type` as never}
                      control={control}
                      render={({ field: typeField }) => (
                        <FormSelect
                          label="ประเภทพื้นที่ (WBGT)"
                          placeholder="-- เลือกประเภท --"
                          options={[
                            { value: "in", label: "ในอาคาร (WBGT in)" },
                            { value: "out", label: "นอกอาคาร (WBGT out)" },
                          ]}
                          {...typeField}
                          value={typeField.value || "in"}
                          onChange={(e) => {
                            typeField.onChange(e);
                            calculateAndSetWBGT(index, e.target.value);
                          }}
                        />
                      )}
                    />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput
                      label="อุณหภูมิกระเปาะแห้ง DB (°C)"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="ไม่บังคับ"
                      {...register(`heat_areas.${index}.db_temp` as never)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        register(`heat_areas.${index}.db_temp` as never).onChange(e);
                        calculateAndSetWBGT(index);
                      }}
                      error={heatErrors?.[index]?.db_temp?.message}
                    />
                    <FormInput
                      label="อุณหภูมิกระเปาะเปียก WB (°C)"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="ไม่บังคับ"
                      {...register(`heat_areas.${index}.wb_temp` as never)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        register(`heat_areas.${index}.wb_temp` as never).onChange(e);
                        calculateAndSetWBGT(index);
                      }}
                      error={heatErrors?.[index]?.wb_temp?.message}
                    />
                    <FormInput
                      label="อุณหภูมิโกลบ GT (°C)"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="ไม่บังคับ"
                      {...register(`heat_areas.${index}.gt_temp` as never)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        register(`heat_areas.${index}.gt_temp` as never).onChange(e);
                        calculateAndSetWBGT(index);
                      }}
                      error={heatErrors?.[index]?.gt_temp?.message}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Controller
                      name={`heat_areas.${index}.wbgt_in` as never}
                      control={control}
                      render={({ field: wbgtInField }) => (
                        <FormInput
                          label="ค่า WBGT จากเครื่องวัด (°C)"
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          placeholder="ไม่บังคับ"
                          {...wbgtInField}
                          value={wbgtInField.value !== undefined && wbgtInField.value !== null ? String(wbgtInField.value) : ""}
                          onChange={(e) => {
                            wbgtInField.onChange(e);
                            if (e.target.value !== "") {
                              setValue(`heat_areas.${index}.wbgt_avg` as never, e.target.value as never, { shouldValidate: true });
                            }
                          }}
                          error={heatErrors?.[index]?.wbgt_in?.message}
                        />
                      )}
                    />
                    
                    <Controller
                      name={`heat_areas.${index}.workload` as never}
                      control={control}
                      render={({ field: selectField }) => (
                        <FormSelect
                          label="ประเภทงาน"
                          placeholder="-- เลือกประเภทงาน --"
                          options={HEAT_WORKLOADS}
                          required
                          {...selectField}
                          value={
                            selectField.value !== undefined && selectField.value !== null
                              ? String(selectField.value)
                              : ""
                          }
                          onChange={(e) => {
                            selectField.onChange(e);
                            const val = e.target.value;
                            const std = HEAT_STANDARDS[val as keyof typeof HEAT_STANDARDS];
                            if (std) {
                              setValue(`heat_areas.${index}.standard_value` as never, std.value as never, { shouldValidate: true });
                            }
                          }}
                          error={heatErrors?.[index]?.workload?.message}
                        />
                      )}
                    />

                    <FormInput
                      label="มาตรฐาน (°C)"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="อิงจากประเภทงาน"
                      required
                      {...register(`heat_areas.${index}.standard_value` as never)}
                      error={heatErrors?.[index]?.standard_value?.message}
                    />

                    <FormInput
                      label="ค่า WBGT เฉลี่ย (°C)"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="บังคับระบุ"
                      required
                      {...register(`heat_areas.${index}.wbgt_avg` as never)}
                      error={heatErrors?.[index]?.wbgt_avg?.message}
                    />
                  </div>

                  <FormInput
                    label="หมายเหตุ"
                    placeholder="เช่น ข้อมูลเพิ่มเติม (ถ้ามี)"
                    {...register(`heat_areas.${index}.remark` as never)}
                    error={heatErrors?.[index]?.remark?.message}
                  />
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-2 py-6 flex items-center justify-center gap-2 text-text-secondary hover:text-primary hover:border-primary hover:bg-primary-soft/30 transition-all"
              onClick={() =>
                appendHeat({
                  location_desc: "",
                  start_time: "",
                  end_time: "",
                  db_temp: undefined as any,
                  wb_temp: undefined as any,
                  gt_temp: undefined as any,
                  wbgt_in: undefined as any,
                  wbgt_type: "in" as const,
                  workload: "",
                  wbgt_avg: undefined as any,
                  standard_value: undefined as any,
                  remark: "",
                } as never)
              }
            >
              <PlusCircle className="h-5 w-5" />
              เพิ่มจุดตรวจ
            </Button>
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-3 pb-8">
        <Button type="button" variant="outline" className="flex-1" onClick={onPrev}>
          ย้อนกลับ
        </Button>
        <Button type="submit" className="flex-1">
          สรุปผลการประเมิน
        </Button>
      </div>
    </form>
  );
}
