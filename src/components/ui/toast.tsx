"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastInput {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: {
    (input: ToastInput | string): void;
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
  };
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (input: ToastInput | string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem =
        typeof input === "string"
          ? { id, type: "info", message: input, duration: 4000 }
          : {
              id,
              type: input.type || "info",
              title: input.title,
              message: input.message,
              duration: input.duration ?? 4000,
            };

      setToasts((prev) => [...prev, item]);

      if (item.duration && item.duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, item.duration);
      }
    },
    [dismissToast]
  );

  const showToast = Object.assign(
    (input: ToastInput | string) => addToast(input),
    {
      success: (message: string, title?: string, duration?: number) =>
        addToast({ type: "success", title, message, duration }),
      error: (message: string, title?: string, duration?: number) =>
        addToast({ type: "error", title, message, duration }),
      warning: (message: string, title?: string, duration?: number) =>
        addToast({ type: "warning", title, message, duration }),
      info: (message: string, title?: string, duration?: number) =>
        addToast({ type: "info", title, message, duration }),
    }
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Floating Toast Notification Container */}
      <div
        className="fixed top-5 right-4 z-[9999] flex w-full max-w-sm flex-col gap-2.5 pointer-events-none sm:top-6 sm:right-6"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-top-4",
              toast.type === "success" &&
                "border-emerald-200/80 bg-emerald-50/95 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/95 dark:text-emerald-100",
              toast.type === "error" &&
                "border-rose-200/80 bg-rose-50/95 text-rose-950 dark:border-rose-800 dark:bg-rose-950/95 dark:text-rose-100",
              toast.type === "warning" &&
                "border-amber-200/80 bg-amber-50/95 text-amber-950 dark:border-amber-800 dark:bg-amber-950/95 dark:text-amber-100",
              toast.type === "info" &&
                "border-blue-200/80 bg-blue-50/95 text-blue-950 dark:border-blue-800 dark:bg-blue-950/95 dark:text-blue-100"
            )}
            role="alert"
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === "success" && (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              )}
              {toast.type === "error" && (
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              )}
              {toast.type === "warning" && (
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              )}
              {toast.type === "info" && (
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>

            <div className="flex-1 text-sm">
              {toast.title && (
                <h4 className="font-semibold leading-tight">{toast.title}</h4>
              )}
              <p
                className={cn(
                  "leading-relaxed",
                  toast.title ? "mt-1 text-xs opacity-90" : "font-medium"
                )}
              >
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="mt-0.5 -mr-1 rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
