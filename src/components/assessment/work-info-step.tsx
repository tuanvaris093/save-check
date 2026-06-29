"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workInfoSchema, type WorkInfoFormValues } from "@/lib/schemas";
import { FormInput, FormSelect } from "@/components/forms";
import { Button } from "@/components/ui";
import { POSITION_TYPE_OPTIONS } from "@/lib/constants";

interface WorkInfoStepProps {
  defaultValues?: Partial<WorkInfoFormValues>;
  onNext: (data: WorkInfoFormValues) => void;
  onPrev: () => void;
}

export function WorkInfoStep({
  defaultValues,
  onNext,
  onPrev,
}: WorkInfoStepProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    reset,
  } = useForm<WorkInfoFormValues>({
    resolver: zodResolver(workInfoSchema),
    defaultValues: {
      position_type: "",
      department: "",
      work_experience_years: undefined,
      working_hours_per_day: undefined,
      working_days_per_week: undefined,
      work_area: "",
      ...defaultValues,
    },
    mode: "onTouched",
  });

  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      reset((prev) => ({ ...prev, ...defaultValues }));
    }
  }, [defaultValues, reset]);

  return (
    <form
      onSubmit={handleSubmit(onNext)}
      className="flex flex-col gap-6 animate-fade-in"
      noValidate
    >
      <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
        <h3 className="mb-4 text-card-title font-semibold text-text-primary">
          ข้อมูลการปฏิบัติงาน
        </h3>
        <div className="flex flex-col gap-4">
          <Controller
            name="position_type"
            control={control}
            render={({ field }) => (
              <FormSelect
                label="ประเภทบุคลากร"
                placeholder="เลือกประเภท"
                options={[...POSITION_TYPE_OPTIONS]}
                required
                {...field}
                error={errors.position_type?.message}
              />
            )}
          />

          <FormInput
            label="คณะ / แผนก / ฝ่าย"
            placeholder="ระบุสังกัด"
            required
            {...register("department")}
            error={errors.department?.message}
          />

          <FormInput
            label="อายุงาน (ปี)"
            type="number"
            inputMode="numeric"
            placeholder="ไม่บังคับ"
            {...register("work_experience_years")}
            error={errors.work_experience_years?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="ชั่วโมง/วัน"
              type="number"
              inputMode="numeric"
              placeholder="เวลาทำงาน"
              {...register("working_hours_per_day")}
              error={errors.working_hours_per_day?.message}
            />
            <FormInput
              label="วัน/สัปดาห์"
              type="number"
              inputMode="numeric"
              placeholder="จำนวนวัน"
              {...register("working_days_per_week")}
              error={errors.working_days_per_week?.message}
            />
          </div>
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
        <h3 className="mb-4 text-card-title font-semibold text-text-primary">
          พื้นที่ปฏิบัติงาน
        </h3>
        <div className="flex flex-col gap-4">
          <FormInput
            label="ระบุพื้นที่ปฏิบัติงาน / ห้อง"
            placeholder="เช่น อาคาร A ชั้น 2 ห้อง 201"
            required
            {...register("work_area")}
            error={errors.work_area?.message}
            helperText="ระบุให้ชัดเจนเพื่อให้ง่ายต่อการประเมินสภาพแวดล้อม"
          />
        </div>
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
          ถัดไป
        </Button>
      </div>
    </form>
  );
}
