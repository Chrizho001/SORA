import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import clsx from "clsx";

type Variant = "dark" | "light" | "ghost" | "night" | "white";
type Size = "md" | "lg";

const base =
  "btn group/btn relative inline-flex select-none items-center justify-center gap-2.5 whitespace-nowrap rounded-[11px] font-display font-medium tracking-[-0.01em] transition-[transform,box-shadow,background-color,color] duration-300 ease-[var(--ease-out-expo)] active:scale-[0.97] active:duration-100 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  dark: "bg-[linear-gradient(180deg,#2b2f38_0%,#16181e_100%)] text-white shadow-[var(--shadow-button)] hover:shadow-[0_1px_0_rgb(255_255_255/0.14)_inset,0_14px_26px_-10px_rgb(17_19_24/0.6)]",
  light:
    "bg-surface text-ink shadow-[0_1px_2px_rgb(17_19_24/0.06),0_6px_16px_-8px_rgb(17_19_24/0.18)] ring-1 ring-line [--sheen:rgb(17_19_24/0.05)] hover:ring-line-strong hover:shadow-[0_2px_4px_rgb(17_19_24/0.06),0_14px_26px_-12px_rgb(17_19_24/0.24)]",
  ghost: "text-ink [--sheen:rgb(17_19_24/0.05)] hover:bg-mist",
  night:
    "bg-[linear-gradient(180deg,#2e323b_0%,#1d2027_100%)] text-white ring-1 ring-white/10 shadow-[0_1px_0_rgb(255_255_255/0.08)_inset,0_10px_24px_-10px_rgb(0_0_0/0.7)] [--sheen:rgb(255_255_255/0.12)] hover:ring-white/25",
  /** For night surfaces: the brightest thing on a dark panel. */
  white:
    "bg-white text-ink shadow-[0_1px_0_rgb(255_255_255/0.5)_inset,0_14px_30px_-14px_rgb(0_0_0/0.7)] [--sheen:rgb(17_19_24/0.07)] hover:bg-[#f3f3f4] hover:shadow-[0_1px_0_rgb(255_255_255/0.5)_inset,0_18px_36px_-14px_rgb(0_0_0/0.8)]",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-[3.25rem] px-6 text-base",
};

export function buttonClasses(variant: Variant = "dark", size: Size = "md", className?: string) {
  return clsx(base, variants[variant], sizes[size], className);
}

/**
 * Button label that rolls up letter by letter on hover (styles in
 * globals.css). Screen readers get the plain text once.
 */
export function RollLabel({ children }: { children: ReactNode }) {
  if (typeof children !== "string") return <span>{children}</span>;
  const chars = Array.from(children);
  const row = (clone: boolean) => (
    <span aria-hidden className={clsx("roll-row", clone && "roll-clone")}>
      {chars.map((char, i) => (
        <span key={i} className="roll-char" style={{ "--i": i } as CSSProperties}>
          {char}
        </span>
      ))}
    </span>
  );
  return (
    <span className="roll">
      <span className="sr-only">{children}</span>
      {row(false)}
      {row(true)}
    </span>
  );
}

/** Icon that slides out and is replaced by a fresh copy on hover. */
export function IconSwap({ children, axis = "x" }: { children: ReactNode; axis?: "x" | "y" }) {
  return (
    <span aria-hidden className="icon-swap" data-axis={axis}>
      <span className="grid place-items-center">{children}</span>
      <span className="grid place-items-center">{children}</span>
    </span>
  );
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: Variant;
  size?: Size;
  className?: string;
  icon?: ReactNode;
};

export function ButtonLink({ variant = "dark", size = "md", className, icon, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      <RollLabel>{children as ReactNode}</RollLabel>
      {icon ? <IconSwap>{icon}</IconSwap> : null}
    </Link>
  );
}

/** Text link with a sliding underline. */
export function TextLink({ className, children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={clsx(
        "relative inline-flex items-center gap-1 font-display font-medium text-ink before:absolute before:inset-x-0 before:-bottom-0.5 before:h-px before:bg-current before:opacity-30 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-[var(--ease-out-expo)] hover:after:origin-left hover:after:scale-x-100",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
