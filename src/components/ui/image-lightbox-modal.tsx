"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download } from "lucide-react";
import { formatFileSize } from "@/lib/utils";

export interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  src?: string | null;
  alt?: string;
  fileName?: string;
  fileSize?: number;
  title?: string;
}

export function ImageLightboxModal({
  isOpen,
  onClose,
  src,
  alt = "รูปภาพ",
  fileName,
  fileSize,
  title = "ผังพื้นที่ห้อง (Room Layout)",
}: ImageLightboxModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll and listen for ESC key when modal is open
  useEffect(() => {
    if (isOpen && src) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, src, onClose]);

  if (!mounted || !isOpen || !src) {
    return null;
  }

  const displayName = fileName || title;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex flex-col bg-slate-950/95 backdrop-blur-md animate-fade-in print:hidden select-none w-screen h-screen top-0 left-0"
      onClick={onClose}
    >
      {/* Top Control Bar */}
      <div
        className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4 sm:px-6 bg-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0 pr-4">
          <span className="truncate text-small font-medium text-white/90" title={displayName}>
            {displayName}
          </span>
          {fileSize !== undefined && fileSize > 0 && (
            <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 text-caption text-white/70">
              {formatFileSize(fileSize)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {src && (
            <a
              href={src}
              download={fileName || "room-layout"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-caption font-medium text-white transition-colors cursor-pointer"
              title="ดาวน์โหลดรูปภาพ"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">ดาวน์โหลด</span>
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 p-2 text-white/90 hover:text-white transition-colors cursor-pointer"
            title="ปิด (ESC)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Fullscreen Image Container */}
      <div className="flex flex-1 items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[calc(100vh-5.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-3rem)] object-contain rounded-lg shadow-2xl animate-scale-up"
        />
      </div>

      {/* Bottom Hint */}
      <div className="pb-3 text-center text-[12px] text-white/40 pointer-events-none">
        คลิกพื้นที่ว่างหรือกด ESC เพื่อปิดหน้าต่าง
      </div>
    </div>,
    document.body
  );
}
