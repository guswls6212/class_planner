"use client";

import { usePathname } from "next/navigation";
import { TopBar } from "../molecules/TopBar";
import { BottomTabBar } from "../molecules/BottomTabBar";
import { Sidebar } from "../molecules/Sidebar";

// Routes that render without the App Shell (exact match)
const SHELL_EXCLUDED: string[] = ["/", "/login", "/about"];
// Route prefixes that render without the App Shell
const SHELL_EXCLUDED_PREFIXES: string[] = ["/share/", "/invite/", "/onboarding"];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  if (
    SHELL_EXCLUDED.includes(pathname) ||
    SHELL_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg-primary)]">
      {/* Mobile: TopBar (hidden on md+) */}
      <div className="md:hidden">
        <TopBar />
      </div>

      {/* Desktop: Sidebar (hidden below md) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="pb-14 md:pb-0 md:ml-14">
        {children}
      </main>

      {/* Mobile: BottomTabBar (hidden on md+) */}
      <div className="md:hidden">
        <BottomTabBar />
      </div>
    </div>
  );
}
