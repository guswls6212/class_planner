"use client";

import dynamic from "next/dynamic";
import { Geist, Geist_Mono } from "next/font/google";
import React from "react";
import { ErrorBoundary } from "../components/atoms/ErrorBoundary";
import GlobalErrorHandlers from "../components/atoms/GlobalErrorHandlers";
import { AppShell } from "../components/organisms/AppShell";
import { ThemeProvider } from "../contexts/ThemeContext";
import { useGlobalDataInitialization } from "../hooks/useGlobalDataInitialization";
import { Toaster } from "sonner";
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

function AppContent({ children }: { children: React.ReactNode }) {
  const { isInitializing, conflictState, resolveConflict, isMigrating, migrationError } = useGlobalDataInitialization();

  return (
    <AppShell>
      <ErrorBoundary>
        <GlobalErrorHandlers />
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
      </ErrorBoundary>
    </AppShell>
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
