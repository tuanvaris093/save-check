import * as React from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  text?: string;
  className?: string;
}

export function LoadingState({
  text = "กำลังโหลด...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center gap-3 p-8 text-center animate-fade-in",
        className,
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {text && <p className="text-small text-text-secondary">{text}</p>}
    </div>
  );
}

export function SubmitLoadingOverlay({
  isOpen,
  text = "กำลังบันทึกข้อมูลผลการประเมิน...",
}: {
  isOpen: boolean;
  text?: string;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs animate-fade-in w-screen h-screen top-0 left-0 select-none">
      <div className="flex flex-col items-center gap-3.5 rounded-2xl bg-white px-8 py-7 shadow-2xl animate-scale-up text-center max-w-sm mx-4">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-small font-semibold text-text-primary">{text}</p>
        <p className="text-caption text-text-tertiary">กรุณารอสักครู่ ระบบกำลังจัดเก็บข้อมูลลงฐานข้อมูล...</p>
      </div>
    </div>,
    document.body
  );
}

