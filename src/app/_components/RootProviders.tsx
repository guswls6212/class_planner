"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Toaster } from "sonner";
import { ErrorBoundary } from "../../components/atoms/ErrorBoundary";
import GlobalErrorHandlers from "../../components/atoms/GlobalErrorHandlers";
import { AppShell } from "../../components/organisms/AppShell";
import { AuthProvider } from "../../contexts/AuthContext";
import { ThemeProvider } from "../../contexts/ThemeContext";
import { useGlobalDataInitialization } from "../../hooks/useGlobalDataInitialization";

const DataConflictModal = dynamic(
  () => import("../../components/molecules/DataConflictModal"),
  { ssr: false, loading: () => null },
);

function AppContent({ children }: { children: React.ReactNode }) {
  const { isInitializing, conflictState, resolveConflict, isMigrating, migrationError } =
    useGlobalDataInitialization();

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
        {/* Loading gate (UAT 2026-05-09): isInitializing 동안 children 안 mount.
            stale localStorage가 첫 paint에 보이는 flash UX 제거 — server fetch +
            Phase 1 처리 완료 후만 페이지 mount → 부활처럼 잠깐 보이는 현상 0. */}
        {!isInitializing && children}
      </ErrorBoundary>
    </AppShell>
  );
}

export default function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent>{children}</AppContent>
      {/* Toast position: bottom-center
          - 모바일 PWA 친화 (엄지 reach + 화면 위쪽 차단 안 함)
          - PC도 사용자 피드백("우상단은 너무 멀다")
          theme=dark + richColors → class-planner amber theme과 자연스러움 */}
        <Toaster
          theme="dark"
          richColors
          position="bottom-center"
          toastOptions={{
            style: {
              fontFamily: "var(--font-geist-sans, inherit)",
              fontSize: "13px",
              borderRadius: "8px",
            },
            className: "class-planner-toast",
          }}
        />
        <div aria-live="polite" aria-atomic="true" id="app-live-region" className="sr-only" />
      </ThemeProvider>
    </AuthProvider>
  );
}
