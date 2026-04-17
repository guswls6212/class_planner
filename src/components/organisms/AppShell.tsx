// src/components/organisms/AppShell.tsx
"use client";

import { usePathname } from "next/navigation";
import { TopBar } from "../molecules/TopBar";
import { BottomTabBar } from "../molecules/BottomTabBar";
import { Sidebar } from "../molecules/Sidebar";
import { HelpDrawerProvider } from "../../contexts/HelpDrawerContext";
import { HelpDrawer } from "./HelpDrawer";

const SHELL_EXCLUDED: string[] = ["/", "/login", "/about"];
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
    <HelpDrawerProvider>
      <div className="min-h-dvh bg-[var(--color-bg-primary)]">
        <div className="md:hidden">
          <TopBar />
        </div>
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="pb-14 md:pb-0 md:ml-14">
          {children}
        </main>
        <div className="md:hidden">
          <BottomTabBar />
        </div>
        <HelpDrawer />
      </div>
    </HelpDrawerProvider>
  );
}
