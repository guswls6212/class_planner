"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, BookOpen, GraduationCap, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TabItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const tabs: TabItem[] = [
  { href: "/schedule", icon: CalendarDays, label: "시간표" },
  { href: "/students", icon: Users, label: "학생" },
  { href: "/subjects", icon: BookOpen, label: "과목" },
  { href: "/teachers", icon: GraduationCap, label: "강사" },
  { href: "/settings", icon: Settings, label: "설정" },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-[var(--color-bg-primary)] border-t border-[var(--color-border)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[56px] transition-colors ${
              isActive
                ? "text-accent"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            <Icon size={20} strokeWidth={1.5} />
            {isActive && (
              <span className="text-[10px] font-medium leading-none">{label}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
