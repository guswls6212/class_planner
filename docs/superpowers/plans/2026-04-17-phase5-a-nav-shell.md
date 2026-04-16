# P5-A: Global Nav & Account Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그아웃/계정 메뉴를 TopBar·Sidebar에 탑재하고, 숨겨진 액션(템플릿·공유·PDF)을 ScheduleActionBar로 통합하며, HelpDrawer·HelpTooltip 도움말 시스템을 추가한다.

**Architecture:** `AccountMenu` molecule이 supabase auth를 직접 구독해 로그인/로그아웃 상태를 렌더링한다. `HelpDrawer`는 `HelpDrawerContext`(React Context)를 통해 TopBar의 `?` 버튼과 연결된다. `ScheduleActionBar`는 schedule/page.tsx에서 기존 inline 버튼 div를 대체하는 독립 컴포넌트다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, Vitest + RTL, lucide-react, Supabase Auth

---

## 브랜치·PR 전략

| PR | 브랜치 | Tasks | 전제 조건 |
|---|---|---|---|
| PR-A1 | `feat/phase5-a-account-menu` | Task 1–2 | dev 기준 분기 |
| PR-A2 | `feat/phase5-a-action-bar` | Task 3 | dev 기준 분기 (독립) |
| PR-A3 | `feat/phase5-a-help-system` | Task 4–6 | PR-A1 dev 머지 후 분기 |

---

## File Map

### PR-A1: AccountMenu

| 작업 | 파일 |
|---|---|
| Create | `src/components/molecules/AccountMenu.tsx` |
| Create | `src/components/molecules/__tests__/AccountMenu.test.tsx` |
| Modify | `src/components/organisms/LoginButton.tsx` (드롭다운 제거, CTA만 유지) |
| Modify | `src/components/molecules/TopBar.tsx` (Bell 제거, AccountMenu 추가) |
| Modify | `src/components/molecules/Sidebar.tsx` (하단 compact AccountMenu 추가) |

### PR-A2: ScheduleActionBar

| 작업 | 파일 |
|---|---|
| Create | `src/app/schedule/_components/ScheduleActionBar.tsx` |
| Create | `src/app/schedule/_components/__tests__/ScheduleActionBar.test.tsx` |
| Modify | `src/app/schedule/page.tsx` (inline 버튼 div → ScheduleActionBar) |

### PR-A3: HelpDrawer + HelpTooltip

| 작업 | 파일 |
|---|---|
| Create | `src/contexts/HelpDrawerContext.tsx` |
| Create | `src/components/molecules/HelpTooltip.tsx` |
| Create | `src/components/molecules/__tests__/HelpTooltip.test.tsx` |
| Create | `src/components/organisms/HelpDrawer.tsx` |
| Create | `src/components/organisms/__tests__/HelpDrawer.test.tsx` |
| Modify | `src/components/organisms/AppShell.tsx` (HelpDrawerProvider + HelpDrawer 추가) |
| Modify | `src/components/molecules/TopBar.tsx` (`?` 버튼 + useHelpDrawer) |
| Modify | `src/app/schedule/_components/ScheduleHeader.tsx` (HelpTooltip 추가) |

---

## PR-A1: AccountMenu

### Task 1: AccountMenu 컴포넌트 생성

**Files:**
- Create: `src/components/molecules/AccountMenu.tsx`
- Create: `src/components/molecules/__tests__/AccountMenu.test.tsx`

- [ ] **Step 1: 테스트 파일 작성 (실패 예상)**

```tsx
// src/components/molecules/__tests__/AccountMenu.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// supabase mock (비로그인 기본)
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});
const mockSignOut = vi.fn().mockResolvedValue({});

vi.mock("../../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
      onAuthStateChange: (cb: (event: string, session: null) => void) => {
        mockOnAuthStateChange(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signOut: () => mockSignOut(),
    },
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../../../lib/localStorageCrud", () => ({
  clearUserClassPlannerData: vi.fn(),
}));

import { AccountMenu } from "../AccountMenu";

describe("AccountMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("비로그인 상태에서 로그인 링크를 렌더한다", async () => {
    render(<AccountMenu />);
    await waitFor(() => {
      expect(screen.getByText("로그인")).toBeDefined();
    });
  });

  it("compact=true 비로그인 상태에서 아무것도 렌더하지 않는다", async () => {
    const { container } = render(<AccountMenu compact />);
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it("로그인 상태에서 아바타 버튼을 렌더한다", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "u1",
          email: "test@example.com",
          user_metadata: { full_name: "테스트", avatar_url: "" },
        },
      },
    });
    render(<AccountMenu />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "계정 메뉴" })).toBeDefined();
    });
  });

  it("아바타 클릭 시 드롭다운에 이메일과 로그아웃 버튼이 표시된다", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "u1",
          email: "test@example.com",
          user_metadata: {},
        },
      },
    });
    render(<AccountMenu />);
    await waitFor(() => screen.getByRole("button", { name: "계정 메뉴" }));
    fireEvent.click(screen.getByRole("button", { name: "계정 메뉴" }));
    expect(screen.getByText("test@example.com")).toBeDefined();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd class-planner
npx vitest run src/components/molecules/__tests__/AccountMenu.test.tsx
```

Expected: FAIL — `Cannot find module '../AccountMenu'`

- [ ] **Step 3: AccountMenu 구현**

```tsx
// src/components/molecules/AccountMenu.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabaseClient";
import { clearUserClassPlannerData } from "../../lib/localStorageCrud";

interface AccountMenuProps {
  compact?: boolean;
}

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: { avatar_url?: string; full_name?: string };
}

export function AccountMenu({ compact = false }: AccountMenuProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!isConfigured) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const currentUserId = localStorage.getItem("supabase_user_id");
    if (currentUserId) clearUserClassPlannerData(currentUserId);
    localStorage.removeItem("supabase_user_id");
    document.cookie = "onboarded=; Path=/; Max-Age=0";
    await supabase.auth.signOut();
    setTimeout(() => window.location.reload(), 500);
  };

  if (!user) {
    if (compact) return null;
    return (
      <Link
        href="/login"
        className="px-3 py-1.5 text-sm rounded-admin-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors"
      >
        로그인
      </Link>
    );
  }

  const initials = user.email?.charAt(0).toUpperCase() ?? "U";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-primary)] overflow-hidden hover:ring-2 hover:ring-accent transition-all"
        aria-label="계정 메뉴"
        aria-expanded={isOpen}
      >
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt="프로필"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-sm font-semibold text-white">{initials}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-[9999] min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-admin-md p-2">
            <div className="px-2 pb-2 mb-2 border-b border-[var(--color-border)]">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {user.user_metadata?.full_name ??
                  user.email?.split("@")[0] ??
                  "사용자"}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate">
                {user.email}
              </p>
            </div>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center w-full px-2 py-1.5 rounded-md text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors"
            >
              설정
            </Link>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center w-full px-2 py-1.5 rounded-md text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors"
            >
              초대 관리
            </Link>
            <button
              onClick={handleLogout}
              aria-label="로그아웃"
              className="flex items-center w-full px-2 py-1.5 rounded-md text-sm text-semantic-danger hover:bg-[var(--color-overlay-light)] transition-colors"
            >
              로그아웃
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/components/molecules/__tests__/AccountMenu.test.tsx
```

Expected: 4 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/molecules/AccountMenu.tsx \
        src/components/molecules/__tests__/AccountMenu.test.tsx
git commit -m "feat(nav): add AccountMenu molecule with auth-aware rendering"
```

---

### Task 2: TopBar·LoginButton·Sidebar 업데이트

**Files:**
- Modify: `src/components/molecules/TopBar.tsx`
- Modify: `src/components/organisms/LoginButton.tsx`
- Modify: `src/components/molecules/Sidebar.tsx`

> **Context:** TopBar는 모바일 전용 상단 바. Bell 아이콘(dead button)을 제거하고 오른쪽에 AccountMenu를 배치한다. LoginButton.tsx는 드롭다운을 제거하고 /login 페이지 CTA 역할(Google OAuth 트리거)만 남긴다. Sidebar 하단에 compact AccountMenu를 배치한다.

- [ ] **Step 1: TopBar 수정**

전체 파일을 아래로 교체:

```tsx
// src/components/molecules/TopBar.tsx
"use client";

import { AccountMenu } from "./AccountMenu";

export function TopBar() {
  return (
    <header className="flex items-center justify-between px-4 h-12 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] sticky top-0 z-40 pt-safe">
      <span className="text-label font-semibold text-[var(--color-text-primary)] tracking-wide">
        CLASS PLANNER
      </span>
      <div className="flex items-center gap-2">
        <AccountMenu />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: LoginButton.tsx 단순화**

`LoginButton.tsx`의 "로그인" 상태(드롭다운) 분기를 제거하고 CTA 버튼만 남긴다. 파일 전체를 아래로 교체:

```tsx
// src/components/organisms/LoginButton.tsx
"use client";

import React from "react";
import { supabase } from "../../utils/supabaseClient";
import { logger } from "../../lib/logger";

interface LoginButtonProps {
  className?: string;
}

const LoginButton: React.FC<LoginButtonProps> = ({ className }) => {
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) {
      alert("로그인 기능이 설정되지 않았습니다. 관리자에게 문의하세요.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/students` },
    });
    if (error) {
      logger.error("Google 로그인 에러:", undefined, error as Error);
    }
  };

  return (
    <button
      className={`flex cursor-pointer items-center gap-2 rounded-xl border-none bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to px-[18px] py-2.5 text-sm font-semibold text-white shadow-[0_4px_15px_rgba(102,126,234,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(102,126,234,0.4)] active:translate-y-0 ${className ?? ""}`}
      onClick={handleGoogleLogin}
      title="로그인"
    >
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10,17 15,12 10,7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
      로그인
    </button>
  );
};

export default LoginButton;
```

- [ ] **Step 3: Sidebar 하단에 AccountMenu compact 추가**

`Sidebar.tsx`에서 bottom items 섹션 아래에 `AccountMenu` 추가:

```tsx
// src/components/molecules/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, BookOpen, GraduationCap, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AccountMenu } from "./AccountMenu";

interface SidebarItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const topItems: SidebarItem[] = [
  { href: "/schedule", icon: CalendarDays, label: "시간표" },
  { href: "/students", icon: Users, label: "학생" },
  { href: "/subjects", icon: BookOpen, label: "과목" },
  { href: "/teachers", icon: GraduationCap, label: "강사" },
];

const bottomItems: SidebarItem[] = [
  { href: "/settings", icon: Settings, label: "설정" },
];

function SidebarLink({
  href,
  icon: Icon,
  label,
  isActive,
}: SidebarItem & { isActive: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group relative flex items-center justify-center w-10 h-10 rounded-admin-md transition-colors ${
        isActive
          ? "bg-accent text-[var(--color-admin-ink)]"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)]"
      }`}
    >
      <Icon size={22} strokeWidth={1.5} />
      <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-admin-sm bg-[var(--color-bg-secondary)] px-2 py-1 text-caption text-[var(--color-text-primary)] opacity-0 group-hover:opacity-100 transition-opacity shadow-admin-sm">
        {label}
      </span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-50 flex w-14 flex-col items-center gap-1 py-4 bg-[var(--color-bg-primary)] border-r border-[var(--color-border)]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center">
        <span className="text-xs font-bold text-accent leading-none text-center">CP</span>
      </div>
      <div className="flex flex-col gap-1">
        {topItems.map((item) => (
          <SidebarLink key={item.href} {...item} isActive={isActive(item.href)} />
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-1">
        {bottomItems.map((item) => (
          <SidebarLink key={item.href} {...item} isActive={isActive(item.href)} />
        ))}
        {/* 계정 메뉴 (compact: 아바타만) */}
        <div className="flex items-center justify-center w-10 h-10">
          <AccountMenu compact />
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: 타입 체크 + 단위 테스트 통과 확인**

```bash
cd class-planner
npm run check:quick
```

Expected: type-check PASS, unit tests PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/molecules/TopBar.tsx \
        src/components/organisms/LoginButton.tsx \
        src/components/molecules/Sidebar.tsx
git commit -m "feat(nav): wire AccountMenu into TopBar and Sidebar, simplify LoginButton"
```

- [ ] **Step 6: PR 생성**

```bash
gh pr create \
  --base dev \
  --head feat/phase5-a-account-menu \
  --title "feat(nav): AccountMenu — 로그아웃/계정 메뉴 TopBar·Sidebar 탑재 (P5-A-1)" \
  --body "$(cat <<'EOF'
## Summary
- `AccountMenu` molecule 신설: supabase auth 구독으로 비로그인/로그인 상태 자동 전환
- 비로그인: `/login` 링크, 로그인: 아바타 → 드롭다운(설정·초대 관리·로그아웃)
- `TopBar`에 `AccountMenu` 탑재 (Bell 아이콘 제거)
- `Sidebar` 하단에 compact 아바타 추가
- `LoginButton.tsx` CTA 역할만 유지 (드롭다운 제거)

## Test plan
- [ ] dev 서버에서 로그아웃 상태 → TopBar에 "로그인" 링크 확인
- [ ] 로그인 후 → 아바타 → 드롭다운(이메일·설정·로그아웃) 확인
- [ ] 로그아웃 버튼 → 리로드 후 로그아웃 상태 확인
- [ ] 데스크톱(md+)에서 Sidebar 하단 아바타 확인

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## PR-A2: ScheduleActionBar

### Task 3: ScheduleActionBar 컴포넌트

**Files:**
- Create: `src/app/schedule/_components/ScheduleActionBar.tsx`
- Create: `src/app/schedule/_components/__tests__/ScheduleActionBar.test.tsx`
- Modify: `src/app/schedule/page.tsx`

> **Context:** 현재 `page.tsx:1090-1133`에 PDF/템플릿 버튼이 inline으로 박혀있음. 이를 `ScheduleActionBar`로 추출. `PdfDownloadSection` dynamic import는 제거하고 `ScheduleActionBar`를 dynamic import로 교체.

- [ ] **Step 1: 테스트 파일 작성 (실패 예상)**

```tsx
// src/app/schedule/_components/__tests__/ScheduleActionBar.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../components/molecules/PDFDownloadButton", () => ({
  default: ({
    viewLabel,
    onDownload,
  }: {
    viewLabel?: string;
    onDownload: () => void;
    isDownloading: boolean;
    onDownloadStart: () => void;
    onDownloadEnd: () => void;
  }) => (
    <button onClick={onDownload}>
      {viewLabel ?? "시간표"} PDF 다운로드
    </button>
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import ScheduleActionBar from "../ScheduleActionBar";

const baseProps = {
  viewLabel: "주간 시간표",
  onDownload: vi.fn(),
  isDownloading: false,
  onDownloadStart: vi.fn(),
  onDownloadEnd: vi.fn(),
  userId: null,
  onSaveTemplate: vi.fn(),
  onApplyTemplate: vi.fn(),
  isSaving: false,
};

describe("ScheduleActionBar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PDF 다운로드 버튼을 렌더한다", () => {
    render(<ScheduleActionBar {...baseProps} />);
    expect(screen.getByText("주간 시간표 PDF 다운로드")).toBeDefined();
  });

  it("userId가 null이면 템플릿/공유 버튼이 없다", () => {
    render(<ScheduleActionBar {...baseProps} userId={null} />);
    expect(screen.queryByText("현재 주를 템플릿으로 저장")).toBeNull();
    expect(screen.queryByText("저장된 템플릿 적용하기")).toBeNull();
    expect(screen.queryByText("공유 링크")).toBeNull();
  });

  it("userId가 있으면 템플릿·공유 버튼이 모두 렌더된다", () => {
    render(<ScheduleActionBar {...baseProps} userId="user-1" />);
    expect(screen.getByText("현재 주를 템플릿으로 저장")).toBeDefined();
    expect(screen.getByText("저장된 템플릿 적용하기")).toBeDefined();
    expect(screen.getByText("공유 링크")).toBeDefined();
  });

  it("템플릿 저장 버튼 클릭 시 onSaveTemplate이 호출된다", () => {
    const onSaveTemplate = vi.fn();
    render(<ScheduleActionBar {...baseProps} userId="user-1" onSaveTemplate={onSaveTemplate} />);
    fireEvent.click(screen.getByText("현재 주를 템플릿으로 저장"));
    expect(onSaveTemplate).toHaveBeenCalledTimes(1);
  });

  it("템플릿 적용 버튼 클릭 시 onApplyTemplate이 호출된다", () => {
    const onApplyTemplate = vi.fn();
    render(<ScheduleActionBar {...baseProps} userId="user-1" onApplyTemplate={onApplyTemplate} />);
    fireEvent.click(screen.getByText("저장된 템플릿 적용하기"));
    expect(onApplyTemplate).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd class-planner
npx vitest run src/app/schedule/_components/__tests__/ScheduleActionBar.test.tsx
```

Expected: FAIL — `Cannot find module '../ScheduleActionBar'`

- [ ] **Step 3: ScheduleActionBar 구현**

```tsx
// src/app/schedule/_components/ScheduleActionBar.tsx
"use client";

import React from "react";
import Link from "next/link";
import PDFDownloadButton from "../../../components/molecules/PDFDownloadButton";

interface Props {
  viewLabel: string;
  onDownload: () => Promise<void> | void;
  isDownloading: boolean;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
  userId: string | null;
  onSaveTemplate: () => void;
  onApplyTemplate: () => void;
  isSaving: boolean;
}

export default function ScheduleActionBar({
  viewLabel,
  onDownload,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
  userId,
  onSaveTemplate,
  onApplyTemplate,
  isSaving,
}: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap py-2">
      <PDFDownloadButton
        onDownload={onDownload}
        isDownloading={isDownloading}
        onDownloadStart={onDownloadStart}
        onDownloadEnd={onDownloadEnd}
        viewLabel={viewLabel}
      />
      {userId && (
        <>
          <button
            onClick={onSaveTemplate}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50"
          >
            현재 주를 템플릿으로 저장
          </button>
          <button
            onClick={onApplyTemplate}
            className="px-3 py-1.5 text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            저장된 템플릿 적용하기
          </button>
          <Link
            href="/settings"
            className="px-3 py-1.5 text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            공유 링크
          </Link>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/app/schedule/_components/__tests__/ScheduleActionBar.test.tsx
```

Expected: 5 tests PASS

- [ ] **Step 5: schedule/page.tsx 수정**

`page.tsx`에서 두 가지를 변경한다:

**5a. 동적 임포트 교체** — 파일 상단에서 `PdfDownloadSection` dynamic import를 찾아 `ScheduleActionBar` dynamic import로 교체한다. 기존 코드:

```ts
const PdfDownloadSection = dynamic(
  () => import("./_components/PdfDownloadSection"),
  { ssr: false }
);
```

교체할 코드:

```ts
const ScheduleActionBar = dynamic(
  () => import("./_components/ScheduleActionBar"),
  { ssr: false }
);
```

**5b. JSX 교체** — `page.tsx:1090-1133`의 inline 버튼 div 블록을 찾아 `ScheduleActionBar` 사용으로 교체한다. 기존 코드:

```tsx
      {/* PDF 다운로드 버튼 + 템플릿 버튼 */}
      <div className="flex items-center gap-2 flex-wrap">
        <PdfDownloadSection
          onDownload={() =>
            renderSchedulePdf(
              Array.from(displaySessions.values()).flat(),
              subjects,
              students,
              enrollments,
              teachers,
              {
                academyName: "CLASS PLANNER",
                filterStudentId: selectedStudentId ?? undefined,
              }
            )
          }
          isDownloading={isDownloading}
          onDownloadStart={() => setIsDownloading(true)}
          onDownloadEnd={() => setIsDownloading(false)}
          viewLabel={
            viewMode === "daily"
              ? "일별 시간표"
              : viewMode === "monthly"
                ? "월별 시간표"
                : "주간 시간표"
          }
        />
        {userId && (
          <>
            <button
              onClick={() => setShowSaveTemplateModal(true)}
              className="px-3 py-1.5 text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              템플릿으로 저장
            </button>
            <button
              onClick={() => { _fetchTemplates(); setShowApplyTemplateModal(true); }}
              className="px-3 py-1.5 text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              템플릿 적용
            </button>
          </>
        )}
      </div>
```

교체할 코드:

```tsx
      {/* 액션 바: PDF · 템플릿 · 공유 */}
      <ScheduleActionBar
        viewLabel={
          viewMode === "daily"
            ? "일별 시간표"
            : viewMode === "monthly"
              ? "월별 시간표"
              : "주간 시간표"
        }
        onDownload={() =>
          renderSchedulePdf(
            Array.from(displaySessions.values()).flat(),
            subjects,
            students,
            enrollments,
            teachers,
            {
              academyName: "CLASS PLANNER",
              filterStudentId: selectedStudentId ?? undefined,
            }
          )
        }
        isDownloading={isDownloading}
        onDownloadStart={() => setIsDownloading(true)}
        onDownloadEnd={() => setIsDownloading(false)}
        userId={userId}
        onSaveTemplate={() => setShowSaveTemplateModal(true)}
        onApplyTemplate={() => {
          _fetchTemplates();
          setShowApplyTemplateModal(true);
        }}
        isSaving={templateSaving}
      />
```

- [ ] **Step 6: 타입 체크 + 단위 테스트 확인**

```bash
npm run check:quick
```

Expected: PASS (PdfDownloadSection 관련 타입이 사라지고 ScheduleActionBar로 대체됨)

- [ ] **Step 7: 커밋**

```bash
git add src/app/schedule/_components/ScheduleActionBar.tsx \
        src/app/schedule/_components/__tests__/ScheduleActionBar.test.tsx \
        src/app/schedule/page.tsx
git commit -m "feat(schedule): replace inline action buttons with ScheduleActionBar (P5-A-2)"
```

- [ ] **Step 8: PR 생성**

```bash
gh pr create \
  --base dev \
  --head feat/phase5-a-action-bar \
  --title "feat(schedule): ScheduleActionBar — PDF·템플릿·공유 액션 통합 (P5-A-2)" \
  --body "$(cat <<'EOF'
## Summary
- `ScheduleActionBar` 컴포넌트 신설 (PDF 다운로드 + 템플릿 저장/적용 + 공유 링크)
- 템플릿 버튼 라벨 명확화: "현재 주를 템플릿으로 저장" / "저장된 템플릿 적용하기"
- 공유 링크 버튼: /settings 페이지로 이동 (기존 숨겨진 공유 기능 재접근)
- `page.tsx`의 inline 버튼 div 제거

## Test plan
- [ ] 주간 뷰 → "주간 시간표 PDF 다운로드" 버튼 표시
- [ ] 로그인 시 → 템플릿 저장/적용/공유 버튼 표시
- [ ] 비로그인 시 → PDF만 표시
- [ ] 공유 링크 버튼 → /settings 이동

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## PR-A3: HelpDrawer + HelpTooltip

> **전제 조건:** PR-A1(`feat/phase5-a-account-menu`)이 dev에 머지된 후 dev를 pull하고 새 브랜치 분기.

```bash
git checkout dev && git pull origin dev
git checkout -b feat/phase5-a-help-system
```

### Task 4: HelpTooltip 컴포넌트

**Files:**
- Create: `src/components/molecules/HelpTooltip.tsx`
- Create: `src/components/molecules/__tests__/HelpTooltip.test.tsx`

- [ ] **Step 1: 테스트 파일 작성 (실패 예상)**

```tsx
// src/components/molecules/__tests__/HelpTooltip.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HelpTooltip } from "../HelpTooltip";

describe("HelpTooltip", () => {
  it("i 버튼을 렌더한다", () => {
    render(<HelpTooltip content="도움말 내용" />);
    expect(screen.getByRole("button", { name: "도움말" })).toBeDefined();
  });

  it("기본적으로 팝오버가 닫혀있다", () => {
    render(<HelpTooltip content="도움말 내용" />);
    expect(screen.queryByText("도움말 내용")).toBeNull();
  });

  it("버튼 클릭 시 팝오버가 열린다", () => {
    render(<HelpTooltip content="도움말 내용" />);
    fireEvent.click(screen.getByRole("button", { name: "도움말" }));
    expect(screen.getByText("도움말 내용")).toBeDefined();
  });

  it("백드롭 클릭 시 팝오버가 닫힌다", () => {
    render(<HelpTooltip content="도움말 내용" />);
    fireEvent.click(screen.getByRole("button", { name: "도움말" }));
    expect(screen.getByText("도움말 내용")).toBeDefined();
    fireEvent.click(screen.getByTestId("help-tooltip-backdrop"));
    expect(screen.queryByText("도움말 내용")).toBeNull();
  });

  it("custom label prop이 aria-label에 반영된다", () => {
    render(<HelpTooltip content="내용" label="색상 기준 도움말" />);
    expect(screen.getByRole("button", { name: "색상 기준 도움말" })).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd class-planner
npx vitest run src/components/molecules/__tests__/HelpTooltip.test.tsx
```

Expected: FAIL — `Cannot find module '../HelpTooltip'`

- [ ] **Step 3: HelpTooltip 구현**

```tsx
// src/components/molecules/HelpTooltip.tsx
"use client";

import React, { useState } from "react";

interface HelpTooltipProps {
  content: string;
  label?: string;
}

export function HelpTooltip({ content, label = "도움말" }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={label}
        className="flex items-center justify-center w-4 h-4 rounded-full border border-[var(--color-text-muted)] text-[var(--color-text-muted)] text-[10px] font-bold hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        i
      </button>
      {isOpen && (
        <>
          <div
            data-testid="help-tooltip-backdrop"
            className="fixed inset-0 z-[999]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-6 top-0 z-[1000] w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-xs text-[var(--color-text-secondary)] shadow-admin-md leading-relaxed">
            {content}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/components/molecules/__tests__/HelpTooltip.test.tsx
```

Expected: 5 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/molecules/HelpTooltip.tsx \
        src/components/molecules/__tests__/HelpTooltip.test.tsx
git commit -m "feat(help): add HelpTooltip molecule with popover on i-button click"
```

---

### Task 5: HelpDrawerContext + HelpDrawer 컴포넌트

**Files:**
- Create: `src/contexts/HelpDrawerContext.tsx`
- Create: `src/components/organisms/HelpDrawer.tsx`
- Create: `src/components/organisms/__tests__/HelpDrawer.test.tsx`

- [ ] **Step 1: 테스트 파일 작성 (실패 예상)**

```tsx
// src/components/organisms/__tests__/HelpDrawer.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
  X: () => <svg data-testid="x-icon" />,
}));

import { HelpDrawerProvider, useHelpDrawer } from "../../../contexts/HelpDrawerContext";
import { HelpDrawer } from "../HelpDrawer";

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <HelpDrawerProvider>{children}</HelpDrawerProvider>;
}

function OpenButton() {
  const { open } = useHelpDrawer();
  return <button onClick={open}>열기</button>;
}

describe("HelpDrawer", () => {
  it("기본 상태에서 렌더되지 않는다", () => {
    render(
      <TestWrapper>
        <HelpDrawer />
      </TestWrapper>
    );
    expect(screen.queryByText("도움말")).toBeNull();
  });

  it("open() 후 드로워가 렌더된다", () => {
    render(
      <TestWrapper>
        <OpenButton />
        <HelpDrawer />
      </TestWrapper>
    );
    fireEvent.click(screen.getByText("열기"));
    expect(screen.getByText("도움말")).toBeDefined();
  });

  it("X 버튼 클릭 시 드로워가 닫힌다", () => {
    render(
      <TestWrapper>
        <OpenButton />
        <HelpDrawer />
      </TestWrapper>
    );
    fireEvent.click(screen.getByText("열기"));
    expect(screen.getByText("도움말")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByText("도움말")).toBeNull();
  });

  it("백드롭 클릭 시 드로워가 닫힌다", () => {
    render(
      <TestWrapper>
        <OpenButton />
        <HelpDrawer />
      </TestWrapper>
    );
    fireEvent.click(screen.getByText("열기"));
    fireEvent.click(screen.getByTestId("help-drawer-backdrop"));
    expect(screen.queryByText("도움말")).toBeNull();
  });

  it("도움말 섹션 5개가 렌더된다", () => {
    render(
      <TestWrapper>
        <OpenButton />
        <HelpDrawer />
      </TestWrapper>
    );
    fireEvent.click(screen.getByText("열기"));
    expect(screen.getByText("시간표 작성 시작하기")).toBeDefined();
    expect(screen.getByText("일별·주간·월별 뷰")).toBeDefined();
    expect(screen.getByText("템플릿 저장·적용")).toBeDefined();
    expect(screen.getByText("PDF 출력")).toBeDefined();
    expect(screen.getByText("공유 링크")).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/components/organisms/__tests__/HelpDrawer.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: HelpDrawerContext 구현**

```tsx
// src/contexts/HelpDrawerContext.tsx
"use client";

import React, { createContext, useContext, useState } from "react";

interface HelpDrawerContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const HelpDrawerContext = createContext<HelpDrawerContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

export function HelpDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <HelpDrawerContext.Provider
      value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}
    >
      {children}
    </HelpDrawerContext.Provider>
  );
}

export function useHelpDrawer() {
  return useContext(HelpDrawerContext);
}
```

- [ ] **Step 4: HelpDrawer 구현**

```tsx
// src/components/organisms/HelpDrawer.tsx
"use client";

import React from "react";
import { X } from "lucide-react";
import { useHelpDrawer } from "../../contexts/HelpDrawerContext";

const HELP_SECTIONS = [
  {
    title: "시간표 작성 시작하기",
    content:
      "먼저 학생과 과목을 등록하세요. 좌측 메뉴의 '학생', '과목' 탭에서 추가할 수 있습니다. 등록 후 시간표 화면에서 '+' 버튼을 눌러 수업을 추가하세요.",
  },
  {
    title: "일별·주간·월별 뷰",
    content:
      "우측 상단의 '일별·주간·월별' 버튼으로 보기 방식을 전환합니다. 주간 뷰에서 블록을 드래그해 시간을 이동할 수 있습니다.",
  },
  {
    title: "템플릿 저장·적용",
    content:
      "'현재 주를 템플릿으로 저장'으로 반복되는 시간표를 저장해 두세요. '저장된 템플릿 적용하기'로 다른 주에 동일한 배치를 한 번에 적용합니다.",
  },
  {
    title: "PDF 출력",
    content:
      "PDF 다운로드 버튼을 누르면 현재 보기 기준(일별·주간·월별)으로 시간표가 PDF로 저장됩니다. 인쇄 후 바로 사용할 수 있습니다.",
  },
  {
    title: "공유 링크",
    content:
      "'공유 링크'를 통해 학생이나 학부모에게 시간표를 공유할 수 있습니다. 링크는 설정 페이지에서 만료일을 지정해 생성합니다.",
  },
];

export function HelpDrawer() {
  const { isOpen, close } = useHelpDrawer();

  if (!isOpen) return null;

  return (
    <>
      <div
        data-testid="help-drawer-backdrop"
        className="fixed inset-0 z-[10000] bg-black/30"
        onClick={close}
      />
      <div className="fixed right-0 top-0 bottom-0 z-[10001] w-80 bg-[var(--color-bg-primary)] border-l border-[var(--color-border)] shadow-admin-lg flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg-primary)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            도움말
          </h2>
          <button
            onClick={close}
            aria-label="닫기"
            className="p-1 rounded-admin-md text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4">
          {HELP_SECTIONS.map((section) => (
            <div
              key={section.title}
              className="rounded-lg border border-[var(--color-border)] p-3"
            >
              <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                {section.title}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/components/organisms/__tests__/HelpDrawer.test.tsx
```

Expected: 5 tests PASS

- [ ] **Step 6: 커밋**

```bash
git add src/contexts/HelpDrawerContext.tsx \
        src/components/organisms/HelpDrawer.tsx \
        src/components/organisms/__tests__/HelpDrawer.test.tsx
git commit -m "feat(help): add HelpDrawerContext and HelpDrawer organism with 5 sections"
```

---

### Task 6: AppShell·TopBar·ScheduleHeader 연결

**Files:**
- Modify: `src/components/organisms/AppShell.tsx`
- Modify: `src/components/molecules/TopBar.tsx`
- Modify: `src/app/schedule/_components/ScheduleHeader.tsx`

> **Context:** `HelpDrawerProvider`로 AppShell을 감싸고 `HelpDrawer`를 마운트. TopBar에 `?` 버튼을 추가해 `useHelpDrawer().open()`과 연결. ScheduleHeader의 ColorByToggle 옆에 `HelpTooltip`을 추가.

- [ ] **Step 1: AppShell 수정 — HelpDrawerProvider + HelpDrawer 추가**

전체 파일을 아래로 교체:

```tsx
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
```

- [ ] **Step 2: TopBar 수정 — `?` 버튼 추가**

전체 파일을 아래로 교체:

```tsx
// src/components/molecules/TopBar.tsx
"use client";

import { AccountMenu } from "./AccountMenu";
import { useHelpDrawer } from "../../contexts/HelpDrawerContext";

export function TopBar() {
  const { open } = useHelpDrawer();

  return (
    <header className="flex items-center justify-between px-4 h-12 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] sticky top-0 z-40 pt-safe">
      <span className="text-label font-semibold text-[var(--color-text-primary)] tracking-wide">
        CLASS PLANNER
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={open}
          aria-label="도움말"
          className="p-2 rounded-admin-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors text-sm font-bold"
        >
          ?
        </button>
        <AccountMenu />
      </div>
    </header>
  );
}
```

- [ ] **Step 3: ScheduleHeader 수정 — HelpTooltip 추가**

`ScheduleHeader.tsx`에서 `ColorByToggle` import 아래에 `HelpTooltip` import를 추가하고, ColorBy 토글 옆에 HelpTooltip을 배치한다.

기존 파일 상단 import 블록에 추가:

```ts
import { HelpTooltip } from "../../../components/molecules/HelpTooltip";
```

기존 JSX에서 ColorByToggle 부분을 찾아:

```tsx
          {onColorByChange && (
            <ColorByToggle colorBy={colorBy} onChange={onColorByChange} />
          )}
```

아래로 교체:

```tsx
          {onColorByChange && (
            <div className="flex items-center gap-1">
              <ColorByToggle colorBy={colorBy} onChange={onColorByChange} />
              <HelpTooltip
                label="색상 기준 도움말"
                content="과목별로 색을 구분하거나, 학생·강사 기준으로 전환할 수 있습니다."
              />
            </div>
          )}
```

- [ ] **Step 4: 타입 체크 + 단위 테스트 확인**

```bash
cd class-planner
npm run check:quick
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/organisms/AppShell.tsx \
        src/components/molecules/TopBar.tsx \
        src/app/schedule/_components/ScheduleHeader.tsx
git commit -m "feat(help): wire HelpDrawer into AppShell, add ? button to TopBar, HelpTooltip to ScheduleHeader"
```

- [ ] **Step 6: PR 생성**

```bash
gh pr create \
  --base dev \
  --head feat/phase5-a-help-system \
  --title "feat(help): HelpDrawer·HelpTooltip 도움말 시스템 (P5-A-3)" \
  --body "$(cat <<'EOF'
## Summary
- `HelpDrawerContext` (React Context) 신설 — TopBar의 ? 버튼이 HelpDrawer를 트리거
- `HelpDrawer` organism: 오른쪽 슬라이드 드로워, 5개 도움말 섹션
- `HelpTooltip` molecule: 인라인 i 버튼 → popover
- `AppShell`에 HelpDrawerProvider + HelpDrawer 마운트
- `TopBar`에 `?` 버튼 추가
- `ScheduleHeader`의 ColorBy 토글 옆에 HelpTooltip 배치

## Test plan
- [ ] 모바일 TopBar의 ? 버튼 → HelpDrawer 슬라이드인 확인
- [ ] 드로워 내 5개 섹션 모두 렌더 확인
- [ ] 드로워 X 버튼 및 백드롭 클릭으로 닫기 확인
- [ ] ColorBy 토글 옆 i 버튼 → popover 확인

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## 최종 검증 (전 PR 머지 후)

```bash
cd class-planner
npm run check
npm run dev
```

**Playwright MCP 검증 항목:**
1. `/schedule` 접속 → TopBar에 `?` 버튼 + 계정 아바타/로그인 버튼 표시
2. `?` 버튼 클릭 → HelpDrawer 슬라이드인, 5개 섹션 렌더
3. 로그인 후 아바타 클릭 → 드롭다운(이메일·설정·초대 관리·로그아웃)
4. 로그아웃 → 페이지 리로드 후 "로그인" 표시
5. `/schedule` Action Bar에 "현재 주를 템플릿으로 저장" / "저장된 템플릿 적용하기" / "공유 링크" 표시
6. ColorBy 토글 옆 i 버튼 → popover 표시
7. 데스크톱(md+) → Sidebar 하단에 아바타 표시
