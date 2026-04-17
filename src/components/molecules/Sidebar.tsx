"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, BookOpen, GraduationCap, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AccountMenu } from "./AccountMenu";

interface SidebarItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const topItems: SidebarItem[] = [
  { href: "/schedule", icon: CalendarDays, label: "시간표" },
  { href: "/students", icon: Users, label: "학생" },
  { href: "/subjects", icon: BookOpen, label: "과목" },
  { href: "/teachers", icon: GraduationCap, label: "강사" },
];

const bottomItems: SidebarItem[] = [
  { href: "/settings", icon: Settings, label: "설정" },
];

function SidebarLink({
  href,
  icon: Icon,
  label,
  isActive,
}: SidebarItem & { isActive: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group relative flex items-center justify-center w-10 h-10 rounded-admin-md transition-colors ${
        isActive
          ? "bg-accent text-[var(--color-admin-ink)]"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)]"
      }`}
    >
      <Icon size={22} strokeWidth={1.5} />
      <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-admin-sm bg-[var(--color-bg-secondary)] px-2 py-1 text-caption text-[var(--color-text-primary)] opacity-0 group-hover:opacity-100 transition-opacity shadow-admin-sm">
        {label}
      </span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-50 flex w-14 flex-col items-center gap-1 py-4 bg-[var(--color-bg-primary)] border-r border-[var(--color-border)]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center">
        <span className="text-xs font-bold text-accent leading-none text-center">CP</span>
      </div>
      <div className="flex flex-col gap-1">
        {topItems.map((item) => (
          <SidebarLink key={item.href} {...item} isActive={isActive(item.href)} />
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-1">
        {bottomItems.map((item) => (
          <SidebarLink key={item.href} {...item} isActive={isActive(item.href)} />
        ))}
        <div className="flex items-center justify-center w-10 h-10">
          <AccountMenu compact />
        </div>
      </div>
    </aside>
  );
}
