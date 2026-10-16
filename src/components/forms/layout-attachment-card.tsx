"use client";
import type { ReactNode } from "react";
import { Image as ImageIcon } from "lucide-react";
import type { LayoutFileInfo } from "@/types";
import { FileUpload } from "./file-upload";

export function LayoutAttachmentCard({
  value,
  onChange,
  children,
  downloadUrl,
}: {
  value?: LayoutFileInfo | null;
  onChange?: (file: LayoutFileInfo | null) => void;
  children?: ReactNode;
  downloadUrl?: string;
}) {
  return (
    <section
      className="form-section-card p-5 sm:p-6"
      aria-label="ผังพื้นที่ห้อง"
      data-layout-attachment
    >
      <h3 className="flex items-center gap-2 font-semibold">
        <ImageIcon className="text-primary h-4 w-4" aria-hidden="true" />
        ผังพื้นที่ห้อง (Room Layout)
      </h3>
      <p className="text-text-secondary mt-1 text-xs">
        ผังพื้นที่ห้องและตำแหน่งจุดตรวจวัดสำหรับรายงาน
      </p>
      <div className="mt-4">
        {children ? (
          <>
            <div className="print:hidden">{children}</div>
            <p className="hidden print:block">
              {value
                ? `ไฟล์ผัง: ${value.fileName}`
                : "ไม่มีผังที่บันทึกไว้ในรอบนี้"}
            </p>
          </>
        ) : (
          <FileUpload
            value={value}
            onChange={onChange ?? (() => {})}
            readOnly={!onChange}
            label=""
            downloadUrl={downloadUrl}
          />
        )}
      </div>
    </section>
  );
}
