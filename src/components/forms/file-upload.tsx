"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import {
  UploadCloud,
  FileText,
  Trash2,
  ExternalLink,
  Eye,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { ImageLightboxModal } from "@/components/ui";
import type { LayoutFileInfo } from "@/types";
import { formatFileSize } from "@/lib/utils";
import { beginGlobalLoading } from "@/lib/global-loading";
import { prepareLayoutImage } from "@/lib/v3/prepare-layout-image";

interface FileUploadProps {
  value?: LayoutFileInfo | null;
  onChange: (file: LayoutFileInfo | null) => void;
  onDelete?: () => void;
  maxSizeMB?: number;
  label?: string;
  description?: string;
  className?: string;
  downloadUrl?: string;
  readOnly?: boolean;
}

export function FileUpload({
  value,
  onChange,
  onDelete,
  maxSizeMB = 10,
  label = "แนบผังพื้นที่ห้อง / Layout",
  description = "รับรูปภาพหรือ PDF ไม่เกิน 10 MB · ลดขนาดรูปก่อนบันทึกให้ไม่เกิน 5 MB และคงต้นฉบับหาก JPG ไม่เล็กลง",
  className = "",
  downloadUrl,
  readOnly = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selection = useRef(0);

  const processFile = async (file: File) => {
    setErrorMessage(null);

    if (!file.size) {
      setErrorMessage("ไฟล์ว่าง กรุณาเลือกไฟล์ที่มีข้อมูล");
      return;
    }
    // Validate size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(`ขนาดไฟล์เกินกำหนด (สูงสุด ${maxSizeMB} MB)`);
      return;
    }

    // Validate type
    const isImage = ["image/jpeg", "image/png", "image/webp"].includes(
      file.type,
    );
    const isPdf =
      file.type === "application/pdf" ||
      (!file.type && file.name.toLowerCase().endsWith(".pdf"));

    if (!isImage && !isPdf) {
      setErrorMessage(
        "รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP) หรือไฟล์ PDF เท่านั้น",
      );
      return;
    }

    const current = ++selection.current;
    const finishLoading = beginGlobalLoading();
    try {
      const prepared = isImage ? await prepareLayoutImage(file) : file;
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("File read failed"));
        reader.onabort = () => reject(new Error("File read aborted"));
        reader.readAsDataURL(prepared);
      });
      if (current !== selection.current) return;
      const layoutFile: LayoutFileInfo = {
        fileName: prepared.name,
        fileType: prepared.type || (isPdf ? "application/pdf" : "image/jpeg"),
        fileSize: prepared.size,
        fileData: base64Data,
        uploadedAt: new Date().toISOString(),
      };
      onChange(layoutFile);
    } catch {
      if (current === selection.current)
        setErrorMessage(
          "อ่านหรือแปลงไฟล์ไม่สำเร็จ กรุณาเลือกไฟล์ที่เปิดอ่านได้แล้วลองอีกครั้ง",
        );
    } finally {
      finishLoading();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input value so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemove = () => {
    selection.current++;
    onChange(null);
    setErrorMessage(null);
  };

  const handleOpenPdf = () => {
    if (!value?.fileData) return;
    if (!value.fileData.startsWith("data:")) {
      window.open(value.fileData, "_blank", "noopener,noreferrer");
      return;
    }
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(
        `<iframe src="${value.fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`,
      );
      newWindow.document.title = value.fileName;
    }
  };

  const isImage = value?.fileType.startsWith("image/");
  const isPdf =
    value?.fileType === "application/pdf" ||
    value?.fileName.toLowerCase().endsWith(".pdf");

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-small text-text-primary font-medium">
            {label}
          </label>
          <span className="text-caption text-text-tertiary">ไม่บังคับ</span>
        </div>
      )}

      {description && (
        <p className="text-caption text-text-secondary -mt-1">{description}</p>
      )}

      {/* Hidden File Input */}
      {!readOnly && (
        <input
          ref={fileInputRef}
          name="layout"
          aria-label={label || "เลือกไฟล์ผังพื้นที่ห้อง"}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="text-caption animate-fade-in flex items-center gap-2 rounded-lg border border-red-200/80 bg-red-50/80 px-3 py-2 text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* File Not Attached: Drag & Drop Dropzone */}
      {!value && readOnly ? (
        <p className="text-text-secondary text-sm">
          ไม่มีผังที่บันทึกไว้ในรอบนี้
        </p>
      ) : !value ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="เลือกไฟล์แผนผัง"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-card cursor-pointer border-2 border-dashed p-6 text-center transition-all duration-200 ${
            isDragging
              ? "border-primary bg-primary-tint/40 scale-[1.01]"
              : "hover:border-primary/50 border-gray-200/80 bg-white/40 hover:bg-white/60"
          }`}
        >
          <div className="bg-primary/10 text-primary mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-small text-text-primary font-medium">
            คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
          </p>
          <p className="text-caption text-text-tertiary mt-1">
            รูปภาพ (PNG, JPG, WEBP) หรือเอกสาร PDF (สูงสุด 10MB)
          </p>
        </div>
      ) : (
        /* File Attached: Preview Card */
        <div className="rounded-card animate-fade-in border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Thumbnail / Icon */}
            {isImage ? (
              <div
                onClick={() => setIsPreviewOpen(true)}
                className="group relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-200/80 bg-gray-100"
                title="คลิกเพื่อดูรูปขยาย"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value.fileData}
                  alt={value.fileName}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Eye className="h-5 w-5" />
                </div>
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500">
                <FileText className="h-8 w-8" />
              </div>
            )}

            {/* File Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="text-small text-text-primary truncate font-medium"
                  title={value.fileName}
                >
                  {value.fileName}
                </span>
                {isPdf && (
                  <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                    PDF
                  </span>
                )}
                {isImage && (
                  <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                    รูปภาพ
                  </span>
                )}
              </div>
              {value.fileSize > 0 && (
                <p className="text-caption text-text-secondary mt-0.5">
                  {formatFileSize(value.fileSize)}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 print:hidden">
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="action-button action-button-sm"
                  >
                    ดาวน์โหลดผัง
                  </a>
                )}
                {isImage && (
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(true)}
                    className="action-button action-button-sm"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    ดูรูปขยาย
                  </button>
                )}
                {isPdf && (
                  <button
                    type="button"
                    onClick={handleOpenPdf}
                    className="action-button action-button-sm"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    เปิดดู PDF
                  </button>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="action-button action-button-sm"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    เปลี่ยนไฟล์
                  </button>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={onDelete || handleRemove}
                    className="action-button action-button-sm border-red-200 text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    ลบ
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal for Image Preview */}
      <ImageLightboxModal
        isOpen={isPreviewOpen && !!isImage}
        onClose={() => setIsPreviewOpen(false)}
        src={value?.fileData}
        fileName={value?.fileName}
        fileSize={value?.fileSize}
        title="ผังพื้นที่ห้อง (Room Layout)"
      />
    </div>
  );
}
