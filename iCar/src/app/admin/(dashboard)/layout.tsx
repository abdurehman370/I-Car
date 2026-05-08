import type { PropsWithChildren } from "react";
import AdminPortalLayout from "@/components/Layouts/AdminPortalLayout";

export default function DashboardLayout({ children }: PropsWithChildren) {
    return (
        <AdminPortalLayout>
            {children}
        </AdminPortalLayout>
    );
}
