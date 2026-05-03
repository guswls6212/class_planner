"use client";

/**
 * Skeleton — Tailwind shimmer placeholder for loading states.
 * Use sparingly: only when data hasn't yet loaded AND there's no cached
 * version to show (per ARCHITECTURE.md § 1.4 PWA & Mobile-First, prefer
 * cached content over skeletons when possible).
 *
 * Usage:
 *   <Skeleton className="h-4 w-32 rounded" />        // single bar
 *   <Skeleton variant="circle" className="w-9 h-9" />// circular avatar
 *   <SkeletonRow />                                  // pre-built row
 */
interface SkeletonProps {
  className?: string;
  variant?: "rect" | "circle";
}

export function Skeleton({ className = "", variant = "rect" }: SkeletonProps) {
  const shape = variant === "circle" ? "rounded-full" : "rounded-md";
  return (
    <div
      className={`animate-pulse bg-[var(--color-overlay-light)] ${shape} ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonRow — placeholder for a single student-list row
 * (avatar + 2-line text). Used during initial access-codes load.
 */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Skeleton variant="circle" className="w-9 h-9 flex-shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-2.5 w-32" />
      </div>
    </div>
  );
}
