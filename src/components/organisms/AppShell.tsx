// src/components/organisms/AppShell.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { syncDevShowHiddenFromUrl } from "../../config/features";
import { TopBar } from "../molecules/TopBar";
import { BottomTabBar } from "../molecules/BottomTabBar";
import { Sidebar } from "../molecules/Sidebar";
import { InlineTour } from "../molecules/InlineTour";
import { HelpDrawerProvider } from "../../contexts/HelpDrawerContext";
import { HelpDrawer } from "./HelpDrawer";
import { SidebarProvider, useSidebar } from "../../contexts/SidebarContext";

const SHELL_EXCLUDED: string[] = ["/", "/login", "/about"];
const SHELL_EXCLUDED_PREFIXES: string[] = ["/share/", "/invite/", "/onboarding", "/academy/"];

interface AppShellProps {
  children: React.ReactNode;
}

function AppShellInner({ children }: AppShellProps) {
  const { expanded } = useSidebar();
  const pathname = usePathname();

  // 개발자 모드 영구화: ?dev=1 → 숨긴 기능 어디서나 표시(localStorage), ?dev=0 → 해제
  useEffect(() => {
    syncDevShowHiddenFromUrl();
  }, [pathname]);

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
        <main
          className={`pb-14 md:pb-0 transition-[margin] duration-200 ${
            expanded ? "md:ml-52" : "md:ml-14"
          }`}
        >
          {children}
        </main>
        <div className="md:hidden">
          <BottomTabBar />
        </div>
        <HelpDrawer />
        <InlineTour />
      </div>
    </HelpDrawerProvider>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppShellInner>{children}</AppShellInner>
    </SidebarProvider>
  );
}
