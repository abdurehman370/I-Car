import { AppLogo } from "@/components/app-logo";

/** @deprecated Use AppLogo — kept for imports that expect BrandMark */
export function BrandMark({
  className,
  tone = "on-dark",
}: {
  className?: string;
  tone?: "on-dark" | "on-light" | "auto";
}) {
  return <AppLogo tone={tone} height={36} className={className} />;
}
