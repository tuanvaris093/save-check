"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  inspectionDataSchema,
  type InspectionDataFormValues,
} from "@/lib/schemas";
import { FormInput, FormSelect } from "@/components/forms";
import { Button } from "@/components/ui";

interface InspectionDataStepProps {
  defaultValues?: Partial<InspectionDataFormValues>;
  onNext: (data: InspectionDataFormValues) => void;
}

const MEASUREMENT_TECHNIQUES = [
  { value: "Area Measurement", label: "Area Measurement" },
  { value: "Spot Measurement", label: "Spot Measurement" },
];

export function InspectionDataStep({
  defaultValues,
  onNext,
}: InspectionDataStepProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<InspectionDataFormValues>({
    resolver: zodResolver(inspectionDataSchema),
    defaultValues: {
      inspector_name: "",
      position: "",
      inspection_location: "",
      inspection_date: "",
      equipment: "",
      measurement_technique: "",
      start_time: "",
      end_time: "",
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
      <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
        <h3 className="mb-4 text-card-title font-semibold text-text-primary">
          ข้อมูลการตรวจ
        </h3>
        <div className="flex flex-col gap-4">
          <FormInput
            label="ชื่อ-นามสกุลผู้ตรวจ"
            placeholder="เช่น สมชาย ใจดี"
            required
            {...register("inspector_name")}
            error={errors.inspector_name?.message}
          />

          <FormInput
            label="ตำแหน่ง"
            placeholder="ระบุตำแหน่ง"
            required
            {...register("position")}
            error={errors.position?.message}
          />

          <FormInput
            label="สถานที่ตรวจ"
            placeholder="ระบุสถานที่ตรวจ (เช่น อาคารผู้ป่วยนอก)"
            required
            {...register("inspection_location")}
            error={errors.inspection_location?.message}
          />

          <FormInput
            label="วันที่ทำการตรวจวัด"
            type="date"
            required
            {...register("inspection_date")}
            error={errors.inspection_date?.message}
          />

          <FormInput
            label="เครื่องมือที่ใช้"
            placeholder="เช่น Lux meter รุ่น: tm-204"
            required
            {...register("equipment")}
            error={errors.equipment?.message}
          />

          <Controller
            name="measurement_technique"
            control={control}
            render={({ field }) => (
              <FormSelect
                label="เทคนิคการตรวจวัด"
                placeholder="เลือกเทคนิค"
                options={MEASUREMENT_TECHNIQUES}
                required
                {...field}
                error={errors.measurement_technique?.message}
              />
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="เวลาเริ่ม"
              type="time"
              required
              {...register("start_time")}
              error={errors.start_time?.message}
            />
            <FormInput
              label="เวลาสิ้นสุด"
              type="time"
              required
              {...register("end_time")}
              error={errors.end_time?.message}
            />
          </div>
        </div>
      </div>

      <div className="mt-2 pb-8">
        <Button type="submit" className="w-full">
          ถัดไป
        </Button>
      </div>
    </form>
  );
}
