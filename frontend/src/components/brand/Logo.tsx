import { site } from "@/content/site";

type MarkProps = { className?: string; title?: string };

/**
 * SORA mark: an "S" built from two interlocking slanted plates around a
 * square aperture. The two plates are 180° rotations of each other.
 */
export function LogoMark({ className, title }: MarkProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={5}
      strokeLinejoin="round"
    >
      <path d="M14 34 L110 8 L78 40 L42 40 L42 70 L14 98 Z" />
      <path d="M106 86 L10 112 L42 80 L78 80 L78 50 L106 22 Z" />
    </svg>
  );
}

export function Logo({ className = "", tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${tone === "ink" ? "text-ink" : "text-white"} ${className}`}
    >
      <LogoMark className="size-7 shrink-0 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-rotate-12" />
      <span className="font-display text-[1.375rem] font-semibold tracking-[0.04em]">{site.name}</span>
    </span>
  );
}
