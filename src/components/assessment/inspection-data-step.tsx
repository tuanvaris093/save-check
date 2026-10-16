"use client";
import { LayoutAttachmentCard } from "@/components/forms/layout-attachment-card";
import { focusFormError } from "@/lib/v3/form-errors";
import { useStepDraft, useSaveDraft } from "@/hooks/use-step-draft";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  inspectionDataSchema,
  type InspectionDataFormValues,
} from "@/lib/schemas";
import { FormInput } from "@/components/forms";
import { Button } from "@/components/ui";
import type { LayoutFileInfo } from "@/types";

interface InspectionDataStepProps {
  defaultValues?: Partial<InspectionDataFormValues>;
  layoutFile?: LayoutFileInfo | null;
  onNext: (
    data: InspectionDataFormValues,
    layoutFile?: LayoutFileInfo | null,
  ) => void;
}

export function InspectionDataStep({
  defaultValues,
  layoutFile = null,
  onNext,
}: InspectionDataStepProps) {
  const save = useSaveDraft();
  const [currentLayoutFile, setCurrentLayoutFile] =
    useState<LayoutFileInfo | null>(layoutFile);

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
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
    mode: "onChange",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    if (layoutFile !== undefined) {
      setCurrentLayoutFile(layoutFile);
    }
  }, [layoutFile]);

  const onFormSubmit = (data: InspectionDataFormValues) => {
    onNext(data, currentLayoutFile);
  };

  useStepDraft(watch, "inspectionData");
  return (
    <form
      onSubmit={handleSubmit(onFormSubmit, focusFormError)}
      className="animate-fade-in flex flex-col gap-6"
      noValidate
    >
      <div className="form-section-card p-5">
        <h3 className="text-card-title text-text-primary mb-4 font-semibold">
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

      <LayoutAttachmentCard
        value={currentLayoutFile}
        onChange={(file) => {
          setCurrentLayoutFile(file);
          save?.({ layoutFile: file });
        }}
      />

      <div className="mt-2 pb-8">
        <Button type="submit" className="w-full">
          ถัดไป
        </Button>
      </div>
    </form>
  );
}
