"use client";

import dynamic from "next/dynamic";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { ErrorBoundary } from "../components/atoms/ErrorBoundary";
import GlobalErrorHandlers from "../components/atoms/GlobalErrorHandlers";
import LoginButton from "../components/organisms/LoginButton";
import ThemeToggle from "../components/atoms/ThemeToggle";
import { ThemeProvider } from "../contexts/ThemeContext";
import { useGlobalDataInitialization } from "../hooks/useGlobalDataInitialization";
import { Toaster } from "sonner";
import { useUserTracking } from "../hooks/useUserTracking";
import { logger } from "../lib/logger";
import "./globals.css";

const DataConflictModal = dynamic(
  () => import("../components/molecules/DataConflictModal"),
  { ssr: false, loading: () => null }
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function Navigation() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("supabase_user_id");
    }
    return false;
  });
  const { trackPageView, trackAction } = useUserTracking();

  const navItems = [
    { href: "/students", label: "학생" },
    { href: "/subjects", label: "과목" },
    { href: "/teachers", label: "강사" },
    { href: "/schedule", label: "시간표" },
    ...(isLoggedIn ? [{ href: "/teacher-schedule", label: "내 시간표" }] : []),
    { href: "/settings", label: "설정" },
    { href: "/about", label: "소개" },
  ];

  // 페이지 뷰 추적
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname, trackPageView]);

  // 네비게이션 클릭 핸들러
  const handleNavClick = (href: string, label: string) => {
    trackAction("navigation_click", "nav-link", { href, label });
  };

  // 로그인 상태 확인 - localStorage에서 사용자 ID 확인
  useEffect(() => {
    const checkLoginStatus = () => {
      const userId = localStorage.getItem("supabase_user_id");
      setIsLoggedIn(!!userId);
    };

    checkLoginStatus();

    // 로그인 상태 변화 감지
    const handleAuthChange = () => {
      checkLoginStatus();
    };

    // 로그아웃 이벤트 감지
    window.addEventListener("userLoggedOut", handleAuthChange);

    // 주기적으로 상태 확인 (로그인 시)
    const interval = setInterval(checkLoginStatus, 1000);

    return () => {
      window.removeEventListener("userLoggedOut", handleAuthChange);
      clearInterval(interval);
    };
  }, []);

  if (pathname === "/" && !isLoggedIn) {
    return (
      <nav className="flex justify-between items-center px-12 py-4 border-b border-[--color-border] bg-[--color-bg-secondary]">
        <span className="font-[800] text-lg text-[--color-text-primary]">🗓 클래스 플래너</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors">로그인</Link>
          <Link href="/schedule" className="bg-accent hover:bg-accent-hover text-admin-ink font-bold text-sm px-5 py-2 rounded-admin-md transition-colors">무료로 시작</Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex justify-between items-center px-3 py-3 border-b border-[--color-border] bg-[--color-bg-secondary]">
      <div className="flex gap-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => handleNavClick(item.href, item.label)}
            className={`no-underline px-2 py-1 rounded-[4px] transition-colors ${
              pathname === item.href
                ? "font-[600] bg-[--color-primary] text-white"
                : "font-normal bg-transparent text-[--color-text-primary]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        {isLoggedIn && <ThemeToggle size="small" variant="both" />}
        <LoginButton />
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 flex justify-between items-center px-3 py-3 border-t border-[--color-border] bg-[--color-bg-secondary] z-[1000]">
      <div className="flex gap-3">
        <span className="text-[--color-text-primary] text-sm">클래스 플래너</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[--color-text-primary] text-sm">교육을 더 쉽게 만들어갑니다</span>
      </div>
    </footer>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { isInitializing, conflictState, resolveConflict, isMigrating, migrationError } = useGlobalDataInitialization();

  return (
    <ErrorBoundary>
      <GlobalErrorHandlers />
      <Navigation />
      <main style={{ paddingBottom: "60px" }}>
        {isInitializing && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <span className="loading-text">
              사용자 데이터를 불러오는 중
              <span className="loading-dots">...</span>
            </span>
          </div>
        )}
        {conflictState && (
          <DataConflictModal
            localData={conflictState.localData}
            serverData={conflictState.serverData}
            onSelectServer={() => resolveConflict("server")}
            onSelectLocal={() => resolveConflict("local")}
            isMigrating={isMigrating}
            migrationError={migrationError}
          />
        )}
        {children}
      </main>
      <Footer />
    </ErrorBoundary>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <title>Class Planner</title>
        <meta
          name="description"
          content="클래스 플래너 - 학생과 과목을 관리하고 시간표를 만드는 도구"
        />
        <meta
          name="copyright"
          content="© 2024 클래스 플래너. 모든 권리 보유."
        />
        <meta name="author" content="클래스 플래너 개발팀" />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AppContent>{children}</AppContent>
          <Toaster richColors position="top-right" />
          {/*
           * SR live region — placeholder for future programmatic announcements.
           * Currently unwired: Sonner (<Toaster>) handles toast SR output.
           * Future use: write textContent to announce async feedback to screen readers
           * (e.g. save-success, sync-error) that fall outside Sonner's scope.
           */}
          <div aria-live="polite" aria-atomic="true" id="app-live-region" className="sr-only" />
        </ThemeProvider>
      </body>
    </html>
  );
}
