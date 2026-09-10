"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  Users,
  GraduationCap,
  Building2,
  X,
  Sparkles,
  Copyright,
} from "lucide-react";
import { Button } from "@/components/ui";

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreditsModal({ isOpen, onClose }: CreditsModalProps) {
  // Prevent background scroll when modal is open (React modal scroll lock pattern)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-x-hidden overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className="animate-scale-in relative my-auto max-h-[calc(100dvh-2.5rem)] sm:max-h-[calc(100dvh-3.5rem)] w-full max-w-lg overflow-x-hidden overflow-y-auto overscroll-contain rounded-3xl sm:rounded-[28px] border border-white/60 bg-white/95 p-5 sm:p-7 shadow-2xl backdrop-blur-xl"
        style={{
          boxShadow:
            "0 25px 60px -15px rgba(15, 99, 199, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.8)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-modal-title"
      >
        {/* Top Decorative Gradient */}
        <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-linear-to-br from-primary/20 to-sky-300/30 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-linear-to-tr from-sky-400/15 to-primary/10 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100/80 text-text-secondary hover:bg-slate-200 hover:text-text-primary transition-all active:scale-95"
          aria-label="ปิดหน้าต่าง"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header with App Brand */}
        <div className="flex items-center gap-3 mb-3 sm:mb-4">
          <Image
            src="/assets/logo_savecheck.webp"
            alt="SafeCheck Logo"
            width={44}
            height={44}
            className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-2xl object-contain shadow-md shadow-primary/20"
            priority
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2
                id="credits-modal-title"
                className="text-base sm:text-lg font-bold text-text-primary"
              >
                SafeCheck
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-primary">
                <Sparkles className="h-3 w-3" /> v1.0
              </span>
            </div>
            <p className="text-[11px] sm:text-caption text-text-secondary truncate">
              ระบบประเมินสภาพแวดล้อมและความปลอดภัย
            </p>
          </div>
        </div>

        {/* University Logo (Center above authors) */}
        <div className="flex flex-col items-center justify-center my-1 sm:my-2 pb-1">
          <Image
            src="/assets/logo_u.webp"
            alt="ตราสัญลักษณ์ วิทยาลัยการสาธารณสุขสิรินธร จังหวัดยะลา"
            width={80}
            height={110}
            className="h-20 sm:h-24 md:h-26 w-auto object-contain transition-all"
            priority
          />
        </div>

        {/* Content Body */}
        <div className="flex flex-col gap-3 sm:gap-4 text-small">
          {/* Authors List Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2 mb-3 text-text-primary font-semibold text-body">
              <Users className="h-4 w-4 text-primary" />
              <span>คณะผู้จัดทำ</span>
            </div>
            <div className="flex flex-col gap-2">
              {[
                "นางสาวซูฮัยลา สาเล็ง",
                "นางสาวต่วนอามีนะห์ รอยา",
                "นางสาวสัลวา สตัม",
              ].map((name, index) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded-xl bg-white px-3.5 py-2.5 border border-slate-100 shadow-2xs"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-primary">
                    {index + 1}
                  </span>
                  <span className="font-medium text-text-primary">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Information Card */}
          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
            <div className="flex items-center gap-2 mb-2 text-primary font-semibold">
              <GraduationCap className="h-4 w-4" />
              <span>หลักสูตรและการศึกษา</span>
            </div>
            <p className="text-small text-text-primary leading-relaxed">
              นักศึกษาหลักสูตรวิทยาศาสตร์บัณฑิต
              <br />
              สาขาวิชาอาชีวอนามัยและความปลอดภัย <span className="font-semibold text-primary">รุ่นที่ 3 ชั้นปีที่ 4</span>
            </p>

            <div className="mt-3 pt-3 border-t border-sky-200/50 flex items-start gap-2 text-caption text-text-secondary">
              <Building2 className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <span>วิทยาลัยการสาธารณสุขสิรินธร จังหวัดยะลา</span>
            </div>
          </div>

          {/* Copyright & Disclaimer */}
          <div className="rounded-xl bg-slate-100/70 px-4 py-3 text-caption text-text-muted flex items-start gap-2.5">
            <Copyright className="h-4 w-4 shrink-0 mt-0.5 text-text-secondary" />
            <div className="min-w-0 flex-1 leading-relaxed">
              <p className="font-semibold text-text-secondary">
                สงวนลิขสิทธิ์ พ.ศ. 2569 SafeCheck System
              </p>
              <p className="text-[11px] break-words">
                พัฒนาเพื่อใช้เป็นเครื่องมือประเมินสภาพแวดล้อมในการทำงาน ด้านแสง เสียง ความร้อน และความเสี่ยงต่อสุขภาพ
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action Button */}
        <div className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full rounded-xl py-3 border-slate-200 hover:bg-slate-100"
          >
            ปิดหน้าต่าง
          </Button>
        </div>
      </div>
    </div>
  );
}
