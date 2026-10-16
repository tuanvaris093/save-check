"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import {
  beginGlobalLoading,
  loadingSnapshot,
  loadingServerSnapshot,
  subscribeLoading,
} from "@/lib/global-loading";
export function useGlobalLoading(
  active: boolean,
  phase?: "uploading" | "saving" | "redirecting",
) {
  React.useEffect(() => {
    if (active) return beginGlobalLoading(phase);
  }, [active, phase]);
}
export function LoadingState(_props: { text?: string; className?: string }) {
  void _props;
  useGlobalLoading(true);
  return null;
}
export function SubmitLoadingOverlay({
  isOpen,
  phase = "saving",
}: {
  isOpen: boolean;
  text?: string;
  phase?: "uploading" | "saving" | "redirecting";
}) {
  useGlobalLoading(isOpen, phase);
  return null;
}
export function GlobalLoadingHost() {
  const state = React.useSyncExternalStore(
    subscribeLoading,
    loadingSnapshot,
    loadingServerSnapshot,
  );
  const dialog = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!state.active) return;
    const overflow = document.body.style.overflow;
    const focused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (focused?.isConnected) focused.focus();
    };
  }, [state.active]);
  if (!state.active) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-sm print:hidden"
      data-global-loading
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="กำลังโหลด"
        aria-busy="true"
        tabIndex={-1}
        data-submit-loading={state.phase}
        onKeyDown={(event) => {
          if (["Tab", "Enter", "Escape"].includes(event.key))
            event.preventDefault();
        }}
        className="flex flex-col items-center gap-4 text-center outline-none"
      >
        <Loader2
          aria-hidden="true"
          className="text-primary h-9 w-9 animate-spin"
        />
        <p
          role="status"
          aria-live="polite"
          className="text-text-primary font-semibold"
        >
          กำลังโหลด
        </p>
      </div>
    </div>,
    document.body,
  );
}
