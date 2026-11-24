"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui";
import { saveAdminSession, signInAdmin } from "@/lib/admin-session";

export function AdminLoginDialog({
  onSuccess,
  onClose,
}: {
  onSuccess: (expiresAt: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const passwordId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const password = String(
      new FormData(event.currentTarget).get("password") ?? "",
    );
    try {
      const session = await signInAdmin(password);
      if (!session) {
        setError("รหัสผ่านแอดมินไม่ถูกต้อง");
        return;
      }
      saveAdminSession(session);
      onSuccess(session.expiresAt);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "ไม่สามารถเข้าสู่ระบบแอดมินได้",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="admin-login-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="border-border text-text-primary fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border bg-white p-6 shadow-xl backdrop:bg-slate-950/45"
    >
      <h2 id="admin-login-title" className="text-section-title mb-4 font-bold">
        เข้าสู่ระบบแอดมิน
      </h2>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={passwordId} className="text-sm font-medium">
            รหัสผ่านแอดมิน
          </label>
          <div className="relative">
            <input
              id={passwordId}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={busy}
              className="border-border focus-visible:outline-primary min-h-11 w-full rounded-xl border py-2 pr-12 pl-3 text-base focus-visible:outline-2"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              aria-controls={passwordId}
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute inset-y-0 right-0.5 my-auto"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={busy}
          >
            ยกเลิก
          </Button>
          <Button type="submit" isLoading={busy}>
            เข้าสู่ระบบ
          </Button>
        </div>
      </form>
    </dialog>
  );
}
