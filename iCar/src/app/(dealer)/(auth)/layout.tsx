// app/(dealer)/(auth)/layout.tsx
import type { PropsWithChildren } from "react";

export default function AuthLayout({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#020d1a]">
            {children}
        </div>
    );
}
