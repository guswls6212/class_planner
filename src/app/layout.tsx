"use client";

import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LoginButton from "../components/atoms/LoginButton";
import ThemeToggle from "../components/atoms/ThemeToggle";
import { ThemeProvider } from "../contexts/ThemeContext";
import "./globals.css";

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

  const navItems = [
    { href: "/students", label: "학생" },
    { href: "/subjects", label: "과목" },
    { href: "/schedule", label: "시간표" },
    { href: "/manual", label: "사용법" },
  ];

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-bg-secondary)",
      }}
    >
      <div style={{ display: "flex", gap: 12 }}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              fontWeight: pathname === item.href ? 600 : 400,
              textDecoration: "none",
              padding: "4px 8px",
              borderRadius: "4px",
              background:
                pathname === item.href ? "var(--color-primary)" : "transparent",
              color:
                pathname === item.href ? "white" : "var(--color-text-primary)",
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ThemeToggle size="small" variant="both" />
        <LoginButton />
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        borderTop: "1px solid var(--color-border)",
        background: "var(--color-bg-secondary)",
        zIndex: 1000,
      }}
    >
      <div style={{ display: "flex", gap: 12 }}>
        <span style={{ color: "var(--color-text-primary)", fontSize: "14px" }}>
          클래스 플래너
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "var(--color-text-primary)", fontSize: "14px" }}>
          교육을 더 쉽게 만들어갑니다
        </span>
      </div>
    </footer>
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <Navigation />
          <main style={{ paddingBottom: "60px" }}>{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
