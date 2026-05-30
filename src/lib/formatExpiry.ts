export function formatExpiry(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "만료됨";
  if (days === 0) return "오늘 만료";
  if (days <= 7) return `D-${days} 만료`;
  return `${date.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })} 만료`;
}

export function getExpiryColorClass(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "text-[var(--color-text-muted)]";
  if (days <= 7) return "text-amber-400";
  return "text-[var(--color-text-secondary)]";
}
