"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LoginButton from "../components/atoms/LoginButton";
import ThemeToggle from "../components/atoms/ThemeToggle";
import { ThemeProvider } from "../contexts/ThemeContext";

function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/students", label: "학생" },
    { href: "/subjects", label: "과목" },
    { href: "/schedule", label: "시간표" },
    { href: "/manual", label: "사용법" },
  ];

  return (
    <nav className="flex justify-between items-center p-3 border-b border-border bg-bg-secondary">
      <div className="flex gap-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-2 py-1 rounded text-sm no-underline transition-colors ${
              pathname === item.href
                ? "bg-primary text-white font-semibold"
                : "text-text-primary font-normal bg-transparent hover:bg-bg-tertiary"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle size="small" variant="both" />
        <LoginButton />
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 flex justify-between items-center p-3 border-t border-border bg-bg-secondary z-[1000]">
      <div className="flex gap-3">
        <span className="text-text-primary text-sm">© 2024 클래스 플래너</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-text-primary text-sm">
          교육을 더 쉽게 만들어갑니다
        </span>
      </div>
    </footer>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <Navigation />
      <main className="pb-[60px]">{children}</main>
      <Footer />
    </ThemeProvider>
  );
}
