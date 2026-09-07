"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  inspectionDataSchema,
  type InspectionDataFormValues,
} from "@/lib/schemas";
import { FormInput, FileUpload } from "@/components/forms";
import { Button } from "@/components/ui";
import type { LayoutFileInfo } from "@/types";

interface InspectionDataStepProps {
  defaultValues?: Partial<InspectionDataFormValues>;
  layoutFile?: LayoutFileInfo | null;
  onNext: (data: InspectionDataFormValues, layoutFile?: LayoutFileInfo | null) => void;
}

export function InspectionDataStep({
  defaultValues,
  layoutFile = null,
  onNext,
}: InspectionDataStepProps) {
  const [currentLayoutFile, setCurrentLayoutFile] = useState<LayoutFileInfo | null>(layoutFile);

  const {
    register,
    handleSubmit,
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

  useEffect(() => {
    if (layoutFile !== undefined) {
      setCurrentLayoutFile(layoutFile);
    }
  }, [layoutFile]);

  const onFormSubmit = (data: InspectionDataFormValues) => {
    onNext(data, currentLayoutFile);
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
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

      {/* Optional Room Layout Card */}
      <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-card-title font-semibold text-text-primary">
              ผังพื้นที่ห้อง / Layout
            </h3>
            <span className="rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
              แนบทีหลังได้
            </span>
          </div>
          <p className="mt-1 text-caption text-text-secondary">
            แนบภาพผังห้องหรือไฟล์ PDF ของจุดตรวจวัด หากยังวาดไม่เสร็จสามารถกดข้ามเพื่อดูผลตรวจก่อน แล้วแนบในภายหลังได้
          </p>
        </div>

        <FileUpload
          value={currentLayoutFile}
          onChange={setCurrentLayoutFile}
          label=""
          description="รองรับไฟล์ภาพ (JPG, PNG, WebP) หรือไฟล์เอกสาร PDF (สูงสุด 10MB)"
        />
      </div>

      <div className="mt-2 pb-8">
        <Button type="submit" className="w-full">
          ถัดไป
        </Button>
      </div>
    </form>
  );
}
