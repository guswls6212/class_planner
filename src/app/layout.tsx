import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import React from "react";
import RootProviders from "./_components/RootProviders";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Class Planner",
  description: "클래스 플래너 - 학생과 과목을 관리하고 시간표를 만드는 도구",
  applicationName: "Class Planner",
  authors: [{ name: "클래스 플래너 개발팀" }],
  robots: { index: true, follow: true },
  other: {
    copyright: "© 2024 클래스 플래너. 모든 권리 보유.",
  },
  appleWebApp: {
    capable: true,
    title: "Class Planner",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f59e0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
