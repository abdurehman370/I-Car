import type { PropsWithChildren } from "react";
import PortalLayoutShell from "@/components/Layouts/PortalLayoutShell";

export default function DealerLayout({ children }: PropsWithChildren) {
    return (
        <PortalLayoutShell>
            {children}
        </PortalLayoutShell>
    );
}
