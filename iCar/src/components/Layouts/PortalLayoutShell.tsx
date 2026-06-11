"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import DealerPortalLayout from "@/components/Layouts/DealerPortalLayout";
import PartnerPortalLayout from "@/components/Layouts/PartnerPortalLayout";
import { PARTNER_ROLE, USER_ROLE } from "@/lib/dealer-roles";
import { getPortalHomeForRole } from "@/lib/portal-access";

export default function PortalLayoutShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const [role, setRole] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      try {
        const res = await fetch("/api/dealer/profile", { credentials: "include" });
        if (cancelled) return;

        if (!res.ok) {
          routerRef.current.replace("/login");
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        const userRole: string | null = data.role ?? null;
        setRole(userRole);

        // User accounts use /user/* — hard redirect so refreshed cookie is applied
        if (userRole === USER_ROLE) {
          window.location.assign(getPortalHomeForRole(userRole));
          return;
        }

        setReady(true);
      } catch {
        if (!cancelled) routerRef.current.replace("/login");
      }
    }

    loadRole();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (role === PARTNER_ROLE) {
    return <PartnerPortalLayout>{children}</PartnerPortalLayout>;
  }

  return <DealerPortalLayout>{children}</DealerPortalLayout>;
}
