import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import React from "react";
import { SITE_URL } from "@/lib/seo/site";
import AnalyticsTracker from "./_components/AnalyticsTracker";
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
  // canonical/og:url 의 상대경로(`/`, `/privacy`)를 절대 URL 로 해석하는 기준.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "class-planner — 공부방·교습소·1인 학원 시간표 관리",
    // 하위 페이지가 title 을 string 으로 주면 자동으로 " | class-planner" 접미.
    template: "%s | class-planner",
  },
  description:
    "공부방·교습소·1인 학원을 위한 시간표 관리. 학생별 한 번 입력으로 방 시간표와 학부모 안내까지 자동.",
  applicationName: "class-planner",
  authors: [{ name: "deepcraft" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "class-planner",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
  },
  other: {
    copyright: "© 2026 deepcraft",
  },
  appleWebApp: {
    capable: true,
    title: "class-planner",
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
        {process.env.NODE_ENV === "development" && (
          <script src="/uat/console-tools.js" defer />
        )}
        <RootProviders>{children}</RootProviders>
        <AnalyticsTracker />
      </body>
    </html>
  );
}
