/**
 * CarQ brand mark — a "Q" letterform with a speed-line tail,
 * used as the square logo badge on auth pages.
 */
export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-blue-600 shadow-[0_0_18px_rgba(37,99,235,0.35)] ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[62%] w-[62%]"
        fill="none"
        stroke="white"
        strokeWidth={2.4}
        strokeLinecap="round"
        aria-hidden="true"
      >
        {/* Q body */}
        <circle cx="11" cy="11" r="6.8" />
        {/* Q tail */}
        <path d="M15.6 15.6 L20.2 20.2" />
        {/* speed lines */}
        <path d="M1.6 16.4 h3.1" opacity={0.75} />
        <path d="M3.4 20 h4.2" opacity={0.75} />
      </svg>
    </div>
  );
}
