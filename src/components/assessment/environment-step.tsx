"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  environmentMeasurementSchema,
  type EnvironmentMeasurementFormValues,
  getEnvironmentStandards,
  HEAT_WORKLOADS,
  HEAT_STANDARDS,
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
    formState: { errors, isValid },
    reset,
    setValue,
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
      noise_areas: [{ area_name: "", measure: undefined as any, duration: "" }],
      ...defaultValues,
    } as any,
    mode: "onTouched",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "noise_areas" as never, // cast to never to bypass strict typing issues with as any resolver
  });

  const [average, setAverage] = useState<number | null>(null);

  // Watch for heat workload changes to update standard options
  const workloadLevel = watch("workload_level");
  const m1 = watch("measure_1");
  const m2 = watch("measure_2");
  const m3 = watch("measure_3");

  // Determine standard options
  let standards = getEnvironmentStandards(category);
  if (category === "heat" && workloadLevel) {
    const heatStd = HEAT_STANDARDS[workloadLevel as keyof typeof HEAT_STANDARDS];
    if (heatStd) {
      standards = [heatStd];
    }
  }

  // Pre-fill standard if there's only one option (like for Heat)
  useEffect(() => {
    if (standards.length === 1) {
      setValue("standard_value", standards[0].value, { shouldValidate: true });
    }
  }, [standards, setValue]);

  // Load defaults
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      const mergedDefaults = { ...defaultValues };
      // ensure we have at least one noise area if category is noise
      if (category === "noise" && (!mergedDefaults.noise_areas || mergedDefaults.noise_areas.length === 0)) {
        mergedDefaults.noise_areas = [{ area_name: "", measure: undefined as any, duration: "" }];
      }
      reset((prev) => ({ ...prev, ...mergedDefaults }));
    }
  }, [defaultValues, reset, category]);

  // Calculate Average dynamically (for Light and Heat)
  useEffect(() => {
    if (category !== "noise") {
      setAverage(calculateAverage(m1, m2, m3));
    }
  }, [m1, m2, m3, category]);

  const unitLabel =
    category === "light" ? "Lux" : category === "noise" ? "dBA" : "°C";

  // Type safe errors for noise array
  const noiseErrors = errors.noise_areas as any;

  return (
    <form
      onSubmit={handleSubmit(onNext)}
      className="flex flex-col gap-6 animate-fade-in"
      noValidate
    >
      <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
        <h3 className="mb-4 text-card-title font-semibold text-text-primary">
          แบบฟอร์มบันทึกการตรวจวัด ({ASSESSMENT_CATEGORY_LABELS[category]})
        </h3>
        <div className="flex flex-col gap-4">
          
          {category !== "noise" && (
            <>
              <FormInput
                label="สภาพแวดล้อมการทำงาน"
                placeholder="เช่น ห้องปรับอากาศ, ภายนอกอาคาร"
                required
                {...register("environment_condition")}
                error={errors.environment_condition?.message}
              />

              <FormInput
                label="ลักษณะงาน"
                placeholder="เช่น งานเขียน/อ่าน, งานเครื่องจักร"
                required
                {...register("job_characteristic")}
                error={errors.job_characteristic?.message}
              />
            </>
          )}

          {category === "noise" && (
            <FormInput
              label="ระยะเวลาการปฏิบัติงานของพนักงาน (ชั่วโมง/นาที)"
              placeholder="เช่น 8 ชั่วโมง"
              required
              {...register("working_duration")}
              error={errors.working_duration?.message}
            />
          )}

          {category === "heat" && (
            <Controller
              name="workload_level"
              control={control}
              render={({ field }) => (
                <FormSelect
                  label="ระดับภาระงาน (Workload)"
                  placeholder="-- เลือกระดับภาระงาน --"
                  options={[...HEAT_WORKLOADS]}
                  required
                  {...field}
                  error={errors.workload_level?.message}
                />
              )}
            />
          )}

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

      <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
        <h3 className="mb-4 text-card-title font-semibold text-text-primary flex items-center justify-between">
          <span>
            ค่าที่ตรวจวัดได้ ({unitLabel})
          </span>
          {category !== "noise" && average !== null && (
            <span className="text-small font-normal text-primary bg-primary-soft px-3 py-1 rounded-full">
              ค่าเฉลี่ย: {average} {unitLabel}
            </span>
          )}
        </h3>

        {category === "noise" ? (
          <div className="flex flex-col gap-6">
            <p className="text-caption text-text-secondary -mt-2">
              ระบุพื้นที่ทำงาน ระดับเสียง และระยะเวลาการตรวจวัด (เพิ่มได้สูงสุด 5 พื้นที่)
            </p>
            
            <div className="flex flex-col gap-4">
              {fields.map((field, index) => (
                <div key={field.id} className="relative grid grid-cols-1 md:grid-cols-3 gap-4 p-4 pt-10 border border-border rounded-lg bg-background shadow-sm animate-in fade-in zoom-in-95 duration-200">
                  <div className="absolute top-3 left-4 text-small font-semibold text-text-primary">
                    พื้นที่ทำงานที่ {index + 1}
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="absolute top-2 right-2 text-danger hover:text-danger-hover p-1.5 rounded-full hover:bg-danger-soft transition-colors"
                      title="ลบพื้นที่ทำงาน"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  
                  <FormInput
                    label="พื้นที่ทำงาน *"
                    placeholder="เช่น โซนเครื่องจักร"
                    required
                    {...register(`noise_areas.${index}.area_name` as never)}
                    error={noiseErrors?.[index]?.area_name?.message}
                  />
                  <FormInput
                    label="ความดังเสียง (dBA) *"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="ระบุค่า dBA"
                    required
                    {...register(`noise_areas.${index}.measure` as never)}
                    error={noiseErrors?.[index]?.measure?.message}
                  />
                  <FormInput
                    label="ระยะเวลาที่ตรวจ (ชม./นาที)"
                    placeholder="เช่น 4 ชั่วโมง"
                    {...register(`noise_areas.${index}.duration` as never)}
                    error={noiseErrors?.[index]?.duration?.message}
                  />
                </div>
              ))}
            </div>

            {fields.length < 5 && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed border-2 py-6 flex items-center justify-center gap-2 text-text-secondary hover:text-primary hover:border-primary hover:bg-primary-soft/30 transition-all"
                onClick={() => append({ area_name: "", measure: undefined as any, duration: "" } as never)}
              >
                <PlusCircle className="h-5 w-5" />
                เพิ่มพื้นที่ทำงาน (เพิ่มได้อีก {5 - fields.length} พื้นที่)
              </Button>
            )}

            {/* TWA Field */}
            <div className="mt-4 pt-4 border-t border-border">
              <FormInput
                label="ระดับเสียงเฉลี่ย TWA 8 ชั่วโมง (dBA) *"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="ระบุค่า TWA สุทธิ"
                required
                {...register("twa_8hr")}
                error={errors.twa_8hr?.message}
              />
              <p className="text-caption text-text-secondary mt-1">
                ผลประเมินจะยึดจากค่า TWA 8 ชั่วโมง เพื่อเทียบกับมาตรฐาน
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-4 text-caption text-text-secondary">
              บังคับระบุอย่างน้อย 1 จุด (จุดที่ 1)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormInput
                label="จุดที่ 1 *"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder={`ระบุค่า ${unitLabel}`}
                required
                {...register("measure_1")}
                error={errors.measure_1?.message}
              />
              <FormInput
                label="จุดที่ 2"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="ไม่บังคับ"
                {...register("measure_2")}
                error={errors.measure_2?.message}
              />
              <FormInput
                label="จุดที่ 3"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="ไม่บังคับ"
                {...register("measure_3")}
                error={errors.measure_3?.message}
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-2 flex gap-3 pb-8">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onPrev}
        >
          ย้อนกลับ
        </Button>
        <Button
          type="submit"
          className="flex-[2]"
          disabled={!isValid && Object.keys(errors).length > 0}
        >
          สรุปผลการประเมิน
        </Button>
      </div>
    </form>
  );
}
