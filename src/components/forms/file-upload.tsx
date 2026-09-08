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

interface FileUploadProps {
  value?: LayoutFileInfo | null;
  onChange: (file: LayoutFileInfo | null) => void;
  onDelete?: () => void;
  maxSizeMB?: number;
  label?: string;
  description?: string;
  className?: string;
}

export function FileUpload({
  value,
  onChange,
  onDelete,
  maxSizeMB = 10,
  label = "แนบผังพื้นที่ห้อง / Layout",
  description = "รองรับไฟล์ภาพ (JPG, PNG, WebP) หรือเอกสาร PDF ขนาดไม่เกิน 10MB",
  className = "",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setErrorMessage(null);

    // Validate size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(`ขนาดไฟล์เกินกำหนด (สูงสุด ${maxSizeMB} MB)`);
      return;
    }

    // Validate type
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isImage && !isPdf) {
      setErrorMessage("รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP) หรือไฟล์ PDF เท่านั้น");
      return;
    }

    // Convert to Base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const layoutFile: LayoutFileInfo = {
        fileName: file.name,
        fileType: file.type || (isPdf ? "application/pdf" : "image/jpeg"),
        fileSize: file.size,
        fileData: base64Data,
        uploadedAt: new Date().toISOString(),
      };
      onChange(layoutFile);
    };
    reader.onerror = () => {
      setErrorMessage("เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาลองใหม่อีกครั้ง");
    };
    reader.readAsDataURL(file);
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
    onChange(null);
    setErrorMessage(null);
  };

  const handleOpenPdf = () => {
    if (!value?.fileData) return;
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(
        `<iframe src="${value.fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
      newWindow.document.title = value.fileName;
    }
  };

  const isImage = value?.fileType.startsWith("image/");
  const isPdf = value?.fileType === "application/pdf" || value?.fileName.toLowerCase().endsWith(".pdf");

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-small font-medium text-text-primary">
            {label}
          </label>
          <span className="text-caption text-text-tertiary">ไม่บังคับ</span>
        </div>
      )}

      {description && (
        <p className="text-caption text-text-secondary -mt-1">
          {description}
        </p>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50/80 border border-red-200/80 px-3 py-2 text-caption text-red-600 animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* File Not Attached: Drag & Drop Dropzone */}
      {!value ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-card border-2 border-dashed p-6 text-center transition-all duration-200 ${
            isDragging
              ? "border-primary bg-primary-tint/40 scale-[1.01]"
              : "border-gray-200/80 hover:border-primary/50 bg-white/40 hover:bg-white/60"
          }`}
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-small font-medium text-text-primary">
            คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
          </p>
          <p className="mt-1 text-caption text-text-tertiary">
            รูปภาพ (PNG, JPG, WEBP) หรือเอกสาร PDF (สูงสุด 10MB)
          </p>
        </div>
      ) : (
        /* File Attached: Preview Card */
        <div className="rounded-card border border-white/60 bg-white/80 backdrop-blur-md p-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            {/* Thumbnail / Icon */}
            {isImage ? (
              <div
                onClick={() => setIsPreviewOpen(true)}
                className="relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-200/80 bg-gray-100 group"
                title="คลิกเพื่อดูรูปขยาย"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value.fileData}
                  alt={value.fileName}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 text-white">
                  <Eye className="h-5 w-5" />
                </div>
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 border border-red-100">
                <FileText className="h-8 w-8" />
              </div>
            )}

            {/* File Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-small font-medium text-text-primary" title={value.fileName}>
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
              <p className="mt-0.5 text-caption text-text-secondary">
                {formatFileSize(value.fileSize)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {isImage && (
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(true)}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-caption text-primary hover:bg-primary-tint transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    ดูรูปขยาย
                  </button>
                )}
                {isPdf && (
                  <button
                    type="button"
                    onClick={handleOpenPdf}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-caption text-primary hover:bg-primary-tint transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    เปิดดู PDF
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-caption text-text-secondary hover:bg-gray-100 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  เปลี่ยนไฟล์
                </button>
                <button
                  type="button"
                  onClick={onDelete || handleRemove}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-caption text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบ
                </button>
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
