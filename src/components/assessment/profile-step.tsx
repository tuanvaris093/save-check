"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  respondentProfileSchema,
  type RespondentProfileFormValues,
} from "@/lib/schemas";
import { FormInput, FormSelect, RadioCard } from "@/components/forms";
import { Button } from "@/components/ui";
import {
  GENDER_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  MARITAL_STATUS_OPTIONS,
} from "@/lib/constants";

interface ProfileStepProps {
  defaultValues?: Partial<RespondentProfileFormValues>;
  onNext: (data: RespondentProfileFormValues) => void;
}

export function ProfileStep({ defaultValues, onNext }: ProfileStepProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<RespondentProfileFormValues>({
    resolver: zodResolver(respondentProfileSchema) as any,
    defaultValues: {
      full_name: "",
      gender: "male",
      age: undefined,
      weight: undefined,
      height: undefined,
      education_level: "",
      marital_status: "",
      has_underlying_disease: false,
      underlying_disease_details: "",
      ...defaultValues,
    } as any,
    mode: "onTouched",
  });

  const hasDisease = watch("has_underlying_disease");

  // Allow resetting form if defaultValues change (e.g. loaded from draft later)
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
          ข้อมูลส่วนตัว
        </h3>
        <div className="flex flex-col gap-4">
          <FormInput
            label="ชื่อ-นามสกุล"
            placeholder="เช่น สมชาย ใจดี"
            required
            {...register("full_name")}
            error={errors.full_name?.message}
          />

          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <FormSelect
                label="เพศ"
                placeholder="เลือกเพศ"
                options={[...GENDER_OPTIONS]}
                required
                {...field}
                error={errors.gender?.message}
              />
            )}
          />

          <FormInput
            label="อายุ (ปี)"
            type="number"
            inputMode="numeric"
            placeholder="ตัวเลขเท่านั้น"
            required
            {...register("age")}
            error={errors.age?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="น้ำหนัก (กก.)"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="ไม่บังคับ"
              {...register("weight")}
              error={errors.weight?.message}
            />
            <FormInput
              label="ส่วนสูง (ซม.)"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="ไม่บังคับ"
              {...register("height")}
              error={errors.height?.message}
            />
          </div>

          <Controller
            name="education_level"
            control={control}
            render={({ field }) => (
              <FormSelect
                label="ระดับการศึกษา"
                placeholder="เลือกระดับการศึกษา (ไม่บังคับ)"
                options={[...EDUCATION_LEVEL_OPTIONS]}
                {...field}
                error={errors.education_level?.message}
              />
            )}
          />

          <Controller
            name="marital_status"
            control={control}
            render={({ field }) => (
              <FormSelect
                label="สถานภาพ"
                placeholder="เลือกสถานภาพ (ไม่บังคับ)"
                options={[...MARITAL_STATUS_OPTIONS]}
                {...field}
                error={errors.marital_status?.message}
              />
            )}
          />
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
        <h3 className="mb-4 text-card-title font-semibold text-text-primary">
          ข้อมูลสุขภาพ
        </h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-small font-medium text-text-primary">
              ท่านมีโรคประจำตัวหรือไม่? <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="has_underlying_disease"
                control={control}
                render={({ field }) => (
                  <>
                    <RadioCard
                      label="ไม่มี"
                      checked={field.value === false}
                      onChange={() => field.onChange(false)}
                    />
                    <RadioCard
                      label="มี"
                      checked={field.value === true}
                      onChange={() => field.onChange(true)}
                    />
                  </>
                )}
              />
            </div>
            {errors.has_underlying_disease && (
              <p className="mt-1 text-caption text-danger">
                {errors.has_underlying_disease.message}
              </p>
            )}
          </div>

          {hasDisease && (
            <div className="animate-fade-in">
              <FormInput
                label="ระบุโรคประจำตัว"
                placeholder="เช่น เบาหวาน, ความดัน"
                required
                {...register("underlying_disease_details")}
                error={errors.underlying_disease_details?.message}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 pb-8">
        <Button
          type="submit"
          className="w-full"
          disabled={!isValid && Object.keys(errors).length > 0}
        >
          ถัดไป
        </Button>
      </div>
    </form>
  );
}
