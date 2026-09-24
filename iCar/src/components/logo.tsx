import { AppLogo } from "@/components/app-logo";

/** Legacy sidebar logo — uses CarQ wordmark with light/dark auto tone. */
export function Logo() {
  return (
    <div className="relative py-1">
      <AppLogo tone="auto" height={32} />
    </div>
  );
}
