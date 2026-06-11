"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import UserPortalLayout from "@/components/Layouts/UserPortalLayout";
import { USER_ROLE } from "@/lib/dealer-roles";
import { getPortalHomeForRole } from "@/lib/portal-access";

export default function UserPortalGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/dealer/profile", { credentials: "include" });
        if (cancelled) return;

        if (!res.ok) {
          setStatus("denied");
          routerRef.current.replace("/login");
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        if (data.role !== USER_ROLE) {
          setStatus("denied");
          window.location.assign(getPortalHomeForRole(data.role));
          return;
        }

        setStatus("allowed");
      } catch {
        if (!cancelled) {
          setStatus("denied");
          routerRef.current.replace("/login");
        }
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading" || status === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
      </div>
    );
  }

  return <UserPortalLayout>{children}</UserPortalLayout>;
}
