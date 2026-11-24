"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AdminLoginDialog } from "@/components/dashboard/admin-login-dialog";
import { readAdminSession } from "@/lib/admin-session";
import { ROUTES } from "@/lib/constants";

export function HomeAdminEntry() {
  const [open, setOpen] = useState(false);
  const taps = useRef(0);
  const router = useRouter();

  function handleTap() {
    taps.current += 1;
    if (taps.current < 10) return;
    taps.current = 0;
    if (readAdminSession()) router.push(ROUTES.DASHBOARD);
    else setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleTap}
        aria-label="รูปการ์ตูน SafeCheck"
        className="home-hero-worker block touch-manipulation border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-white"
      >
        <Image
          src="/assets/safecheck-hero-worker.png"
          alt=""
          width={1152}
          height={1366}
          className="block h-auto w-full"
          draggable={false}
          priority
        />
      </button>
      {open && (
        <AdminLoginDialog
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            router.push(ROUTES.DASHBOARD);
          }}
        />
      )}
    </>
  );
}
