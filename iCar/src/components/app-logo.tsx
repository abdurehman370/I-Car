import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_WHITE = "/images/logo/logo-white.svg";
const LOGO_BLACK = "/images/logo/logo-black.svg";

export type LogoTone = "on-dark" | "on-light" | "auto";

type AppLogoProps = {
  tone?: LogoTone;
  className?: string;
  /** Rendered height in px */
  height?: number;
  priority?: boolean;
  href?: string;
};

function LogoImage({
  src,
  height,
  priority,
  className,
}: {
  src: string;
  height: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    // Native img preserves SVG viewBox without Next/Image cropping
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="CarQ"
      className={cn("block w-auto max-w-none shrink-0 object-contain object-left", className)}
      style={{ height, width: "auto" }}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
    />
  );
}

export function AppLogo({
  tone = "auto",
  className,
  height = 32,
  priority,
  href,
}: AppLogoProps) {
  const inner =
    tone === "on-dark" ? (
      <LogoImage src={LOGO_WHITE} height={height} priority={priority} />
    ) : tone === "on-light" ? (
      <LogoImage src={LOGO_BLACK} height={height} priority={priority} />
    ) : (
      <>
        <LogoImage
          src={LOGO_BLACK}
          height={height}
          priority={priority}
          className="dark:hidden"
        />
        <LogoImage
          src={LOGO_WHITE}
          height={height}
          priority={priority}
          className="hidden dark:block"
        />
      </>
    );

  const wrapClass = cn("inline-flex shrink-0 items-center overflow-visible py-0.5", className);

  if (href) {
    return (
      <Link href={href} className={wrapClass} aria-label="CarQ home">
        {inner}
      </Link>
    );
  }

  return <div className={wrapClass}>{inner}</div>;
}

type PortalBrandProps = {
  href: string;
  subtitle: string;
  tone: LogoTone;
  compact?: boolean;
  subtitleClassName?: string;
};

/** Sidebar / auth header: wordmark + optional portal label */
export function PortalBrand({
  href,
  subtitle,
  tone,
  compact = false,
  subtitleClassName,
}: PortalBrandProps) {
  if (compact) {
    return (
      <Link href={href} className="flex justify-center px-1 overflow-visible" aria-label={subtitle}>
        <AppLogo tone={tone} height={22} className="max-w-[4.5rem]" />
      </Link>
    );
  }

  return (
    <Link href={href} className="group flex min-w-0 flex-col gap-2 overflow-visible transition-opacity hover:opacity-90">
      <AppLogo tone={tone} height={32} />
      <p
        className={cn(
          "font-mono text-[9px] font-medium uppercase tracking-[0.28em] text-cyan-400/70",
          subtitleClassName,
        )}
      >
        {subtitle}
      </p>
    </Link>
  );
}
