import type { PropsWithChildren } from "react";
import DealerPortalLayout from "@/components/Layouts/DealerPortalLayout";

export default function DealerLayout({ children }: PropsWithChildren) {
    return (
        <DealerPortalLayout>
            {children}
        </DealerPortalLayout>
    );
}
