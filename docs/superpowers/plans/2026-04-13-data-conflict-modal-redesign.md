# DataConflictModal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬/서버 데이터 충돌 모달을 양쪽 데이터를 명확하게 비교할 수 있도록 리디자인한다. 버튼 편향 제거, 이름 목록 표시, 반응형 레이아웃(데스크탑: 카드 클릭, 모바일: 탭 전환).

**Architecture:** `DataConflictModal.tsx`와 `DataConflictModal.module.css`만 변경. props 구조는 유지하고 내부에서 `serverData`를 실제 렌더링. 디폴트 과목 필터링 상수는 컴포넌트 내부에 선언(별도 유틸 불필요 — 이 컴포넌트에서만 쓰임). 반응형은 CSS의 `@media` 쿼리로 처리.

**Tech Stack:** React 19, TypeScript 5, CSS Modules, Vitest + React Testing Library, Next.js 15 App Router

---

## File Map

| 파일 | 변경 유형 | 역할 |
|------|----------|------|
| `src/components/molecules/DataConflictModal.tsx` | Modify | 전체 컴포넌트 재작성 |
| `src/components/molecules/DataConflictModal.module.css` | Modify | 전체 CSS 재작성 |
| `src/components/molecules/__tests__/DataConflictModal.test.tsx` | Modify | 기존 테스트 업데이트 + 신규 테스트 추가 |

---

## Task 1: 테스트 업데이트 (TDD — 먼저 실패하는 테스트 작성)

**Files:**
- Modify: `src/components/molecules/__tests__/DataConflictModal.test.tsx`

현재 테스트는 버튼 텍스트("서버 데이터 사용", "로컬 데이터 사용")와 카운트 텍스트("학생 3명")를 검증한다. 새 디자인에서 버튼이 사라지고 카드 클릭으로 바뀌므로 테스트를 전면 교체한다.

- [ ] **Step 1: 기존 테스트 파일 전체를 아래 내용으로 교체**

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DataConflictModal from "../DataConflictModal";
import type { ClassPlannerData } from "../../../lib/localStorageCrud";

const makeData = (
  students: { id: string; name: string }[],
  subjects: { id: string; name: string; color?: string }[],
  sessions: { id: string; weekday: number; startsAt: string; endsAt: string }[]
): ClassPlannerData => ({
  students,
  subjects,
  sessions,
  enrollments: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
});

const localData = makeData(
  [
    { id: "s1", name: "김철수" },
    { id: "s2", name: "이영희" },
    { id: "s3", name: "박민준" },
  ],
  [
    { id: "sub1", name: "피아노", color: "#f00" },
    // 디폴트 과목 — 표시 안 됨
    { id: "default-1", name: "초등수학", color: "#fbbf24" },
  ],
  [{ id: "sess1", weekday: 0, startsAt: "09:00", endsAt: "10:00" }]
);

const serverData = makeData(
  [{ id: "ss1", name: "김철수" }],
  [{ id: "ssub1", name: "피아노", color: "#f00" }],
  []
);

describe("DataConflictModal", () => {
  it("로컬 카드에 학생 이름 목록이 렌더된다", () => {
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    // 로컬 카드 안에 학생 이름이 보여야 함
    expect(screen.getAllByText("김철수").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("이영희")).toBeInTheDocument();
    expect(screen.getByText("박민준")).toBeInTheDocument();
  });

  it("디폴트 과목(초등수학 등)은 과목 목록에 표시되지 않는다", () => {
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    expect(screen.queryByText("초등수학")).toBeNull();
    expect(screen.getByText("피아노")).toBeInTheDocument();
  });

  it("로컬 카드 클릭 시 onSelectLocal 호출", () => {
    const onSelectLocal = vi.fn();
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={onSelectLocal}
      />
    );
    // jsdom은 media query를 미적용 → 데스크탑 카드 + 모바일 버튼 모두 DOM에 존재.
    // getAllByTestId로 첫 번째(데스크탑 카드) 클릭.
    fireEvent.click(screen.getAllByTestId("card-local")[0]);
    expect(onSelectLocal).toHaveBeenCalledTimes(1);
  });

  it("서버 카드 클릭 시 onSelectServer 호출", () => {
    const onSelectServer = vi.fn();
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={onSelectServer}
        onSelectLocal={vi.fn()}
      />
    );
    fireEvent.click(screen.getAllByTestId("card-server")[0]);
    expect(onSelectServer).toHaveBeenCalledTimes(1);
  });

  it("backdrop 클릭해도 닫히지 않음", () => {
    const onSelectServer = vi.fn();
    const onSelectLocal = vi.fn();
    const { container } = render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={onSelectServer}
        onSelectLocal={onSelectLocal}
      />
    );
    if (container.firstElementChild) {
      fireEvent.click(container.firstElementChild);
    }
    expect(onSelectServer).not.toHaveBeenCalled();
    expect(onSelectLocal).not.toHaveBeenCalled();
  });

  it("디폴트 과목만 있고 추가 과목이 없으면 과목 섹션에 항목 없음", () => {
    const onlyDefaultSubjects = makeData(
      [{ id: "s1", name: "김철수" }],
      [{ id: "default-1", name: "초등수학", color: "#fbbf24" }],
      []
    );
    render(
      <DataConflictModal
        localData={onlyDefaultSubjects}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    // 초등수학은 필터링되므로 목록에 없어야 함
    expect(screen.queryByText("초등수학")).toBeNull();
  });

  it("세션 경고 배너가 렌더된다", () => {
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npm test -- --reporter=verbose src/components/molecules/__tests__/DataConflictModal.test.tsx
```

Expected: 여러 테스트 FAIL (카드 클릭, 디폴트 과목 필터링, alert 등). 이 상태가 정상.

---

## Task 2: DataConflictModal.tsx 재작성

**Files:**
- Modify: `src/components/molecules/DataConflictModal.tsx`

- [ ] **Step 1: DataConflictModal.tsx 전체를 아래 내용으로 교체**

```tsx
"use client";

import React, { useState } from "react";
import type { ClassPlannerData } from "../../lib/localStorageCrud";
import type { Subject } from "../../lib/planner";
import styles from "./DataConflictModal.module.css";

interface DataConflictModalProps {
  localData: ClassPlannerData;
  serverData: ClassPlannerData;
  onSelectServer: () => void;
  onSelectLocal: () => void;
}

const DEFAULT_SUBJECT_NAMES = new Set([
  "초등수학",
  "중등수학",
  "중등영어",
  "중등국어",
  "중등과학",
  "중등사회",
  "고등수학",
  "고등영어",
  "고등국어",
]);

function filterNonDefaultSubjects(subjects: Subject[]): Subject[] {
  return subjects.filter((s) => !DEFAULT_SUBJECT_NAMES.has(s.name));
}

const DataConflictModal: React.FC<DataConflictModalProps> = ({
  localData,
  serverData,
  onSelectServer,
  onSelectLocal,
}) => {
  const [activeTab, setActiveTab] = useState<"local" | "server">("local");

  const localSubjects = filterNonDefaultSubjects(localData.subjects);
  const serverSubjects = filterNonDefaultSubjects(serverData.subjects);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 카드나 내부 요소 클릭은 무시 — backdrop 자체만 처리
    if (e.target === e.currentTarget) return;
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-modal-title"
      >
        <div className={styles.header}>
          <h2 id="conflict-modal-title" className={styles.title}>
            데이터 충돌이 감지되었습니다
          </h2>
          <p className={styles.subtitle}>
            어느 데이터로 시작할지 선택해주세요.
          </p>
        </div>

        {/* 데스크탑: 카드 Side-by-Side */}
        <div className={styles.cardsGrid}>
          <DataCard
            testId="card-local"
            sourceLabel="로컬 데이터"
            students={localData.students.map((s) => s.name)}
            subjects={localSubjects.map((s) => s.name)}
            sessionCount={localData.sessions.length}
            onClick={onSelectLocal}
          />
          <DataCard
            testId="card-server"
            sourceLabel="서버 데이터"
            students={serverData.students.map((s) => s.name)}
            subjects={serverSubjects.map((s) => s.name)}
            sessionCount={serverData.sessions.length}
            onClick={onSelectServer}
          />
        </div>

        {/* 모바일: 탭 전환 */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabs} role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === "local"}
              className={`${styles.tab} ${activeTab === "local" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("local")}
            >
              로컬 데이터
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "server"}
              className={`${styles.tab} ${activeTab === "server" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("server")}
            >
              서버 데이터
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === "local" ? (
              <>
                <NameSection label="학생" names={localData.students.map((s) => s.name)} />
                <NameSection label="과목" names={localSubjects.map((s) => s.name)} />
                <SessionCount count={localData.sessions.length} />
                <button
                  className={styles.mobileSelectBtn}
                  data-testid="card-local"
                  onClick={onSelectLocal}
                >
                  로컬 데이터로 시작
                </button>
              </>
            ) : (
              <>
                <NameSection label="학생" names={serverData.students.map((s) => s.name)} />
                <NameSection label="과목" names={serverSubjects.map((s) => s.name)} />
                <SessionCount count={serverData.sessions.length} />
                <button
                  className={styles.mobileSelectBtn}
                  data-testid="card-server"
                  onClick={onSelectServer}
                >
                  서버 데이터로 시작
                </button>
              </>
            )}
          </div>
        </div>

        {/* 세션 미동기 경고 */}
        <div className={styles.warningBanner} role="alert">
          <span className={styles.warningIcon}>⚠</span>
          <span>
            로컬 데이터 선택 시 학생·과목은 서버에 동기화되지만,{" "}
            <strong>수업 일정은 이번 로그인에서 동기화되지 않습니다.</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

/* ── 하위 컴포넌트 ────────────────────────────── */

interface DataCardProps {
  testId: string;
  sourceLabel: string;
  students: string[];
  subjects: string[];
  sessionCount: number;
  onClick: () => void;
}

const DataCard: React.FC<DataCardProps> = ({
  testId,
  sourceLabel,
  students,
  subjects,
  sessionCount,
  onClick,
}) => {
  const [selected, setSelected] = useState(false);

  const handleClick = () => {
    setSelected(true);
    onClick();
  };

  return (
    <div
      className={`${styles.dataCard} ${selected ? styles.dataCardSelected : ""}`}
      data-testid={testId}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      <div className={styles.cardSource}>
        <span className={styles.cardSourceDot} />
        {sourceLabel}
      </div>
      <NameSection label="학생" names={students} />
      <NameSection label="과목" names={subjects} />
      <SessionCount count={sessionCount} />
      <div className={styles.selectHint}>
        <CheckIcon selected={selected} />
        <span>{selected ? "✓ 선택됨" : "클릭하여 선택"}</span>
      </div>
    </div>
  );
};

interface NameSectionProps {
  label: string;
  names: string[];
}

const NameSection: React.FC<NameSectionProps> = ({ label, names }) => (
  <div className={styles.section}>
    <div className={styles.sectionLabel}>
      {label}
      <span className={styles.countBadge}>{names.length}명</span>
    </div>
    {names.length > 0 && (
      <ul className={styles.nameList}>
        {names.map((name) => (
          <li key={name} className={styles.nameItem}>
            {name}
          </li>
        ))}
      </ul>
    )}
  </div>
);

interface SessionCountProps {
  count: number;
}

const SessionCount: React.FC<SessionCountProps> = ({ count }) => (
  <div className={styles.section}>
    <div className={styles.sectionLabel}>
      수업
      <span className={styles.countBadge}>{count}개</span>
    </div>
  </div>
);

const CheckIcon: React.FC<{ selected: boolean }> = ({ selected }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke={selected ? "#6366f1" : "currentColor"}
    strokeWidth="1.5"
  >
    <circle cx="8" cy="8" r="6.5" />
    {selected && <path d="M5.5 8l2 2 3-3" />}
  </svg>
);

export default DataConflictModal;
```

- [ ] **Step 2: 타입 체크**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npm run type-check
```

Expected: 오류 없음. 오류 있으면 메시지 확인 후 수정.

---

## Task 3: DataConflictModal.module.css 재작성

**Files:**
- Modify: `src/components/molecules/DataConflictModal.module.css`

- [ ] **Step 1: CSS 파일 전체를 아래 내용으로 교체**

```css
/* ── Backdrop ── */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 16px;
}

/* ── Modal ── */
.modal {
  background: var(--color-bg-primary, #1e293b);
  border-radius: 16px;
  padding: 32px;
  width: 100%;
  max-width: 660px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* ── Header ── */
.header {
  margin-bottom: 24px;
}

.title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary, #f1f5f9);
  margin: 0 0 6px 0;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #64748b);
  margin: 0;
  line-height: 1.5;
}

/* ── Desktop: Cards Grid ── */
.cardsGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

/* ── Mobile: Tabs ── */
.tabsContainer {
  display: none;
  margin-bottom: 16px;
}

/* ── Data Card ── */
.dataCard {
  border: 1.5px solid rgba(148, 163, 184, 0.15);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
  background: rgba(255, 255, 255, 0.02);
  outline: none;
}

.dataCard:hover {
  border-color: rgba(148, 163, 184, 0.45);
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.dataCard:focus-visible {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
}

.dataCardSelected {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
  box-shadow: 0 0 0 1px #6366f1, 0 8px 24px rgba(99, 102, 241, 0.2);
}

/* ── Card Source Label ── */
.cardSource {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-secondary, #475569);
  margin-bottom: 14px;
}

.dataCardSelected .cardSource {
  color: #818cf8;
}

.cardSourceDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

/* ── Sections ── */
.section {
  margin-top: 12px;
}

.section:first-of-type {
  margin-top: 0;
}

.sectionLabel {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary, #475569);
  margin-bottom: 6px;
}

.countBadge {
  font-size: 0.6875rem;
  color: var(--color-text-secondary, #475569);
  background: rgba(71, 85, 105, 0.15);
  border-radius: 4px;
  padding: 1px 5px;
}

/* ── Name List ── */
.nameList {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 96px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.2) transparent;
}

.nameItem {
  font-size: 0.8125rem;
  color: var(--color-text-primary, #cbd5e1);
  padding: 2px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.nameItem::before {
  content: "";
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-text-secondary, #475569);
  flex-shrink: 0;
}

/* ── Select Hint (desktop card bottom) ── */
.selectHint {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.75rem;
  color: var(--color-text-secondary, #475569);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: color 0.18s;
}

.dataCard:hover .selectHint {
  color: var(--color-text-primary, #94a3b8);
}

.dataCardSelected .selectHint {
  color: #818cf8;
}

/* ── Tabs (mobile) ── */
.tabs {
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 16px;
}

.tab {
  flex: 1;
  padding: 8px 0;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary, #64748b);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.tabActive {
  background: #334155;
  color: var(--color-text-primary, #e2e8f0);
}

.tabContent {
  min-height: 140px;
}

/* ── Mobile Select Button ── */
.mobileSelectBtn {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  border: 1.5px solid rgba(148, 163, 184, 0.25);
  border-radius: 10px;
  background: transparent;
  color: var(--color-text-primary, #e2e8f0);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;
}

.mobileSelectBtn:hover {
  border-color: #6366f1;
  color: #818cf8;
  background: rgba(99, 102, 241, 0.06);
}

/* ── Warning Banner ── */
.warningBanner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 8px;
  font-size: 0.75rem;
  color: #fbbf24;
  line-height: 1.5;
}

.warningIcon {
  flex-shrink: 0;
  margin-top: 1px;
}

/* ── Responsive ── */
@media (max-width: 639px) {
  .modal {
    padding: 24px;
    max-width: 100%;
    border-radius: 12px;
  }

  .cardsGrid {
    display: none;
  }

  .tabsContainer {
    display: block;
  }
}
```

- [ ] **Step 2: 테스트 실행 — 전부 통과 확인**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npm test -- --reporter=verbose src/components/molecules/__tests__/DataConflictModal.test.tsx
```

Expected: 전체 PASS (7개 테스트).

- [ ] **Step 3: 전체 테스트 스위트 실행 — 리그레션 없음 확인**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npm run check:quick
```

Expected: type-check + all tests PASS. 실패 있으면 실패한 테스트 확인 후 수정.

---

## Task 4: 커밋

**Files:** 위에서 수정한 3개 파일 전부

- [ ] **Step 1: 커밋**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git add src/components/molecules/DataConflictModal.tsx \
        src/components/molecules/DataConflictModal.module.css \
        src/components/molecules/__tests__/DataConflictModal.test.tsx
git commit -m "feat(modal): redesign DataConflictModal with side-by-side cards and tab layout

- Show both local and server data side by side (desktop) / tabs (mobile)
- Filter default subjects from display (초등수학, 중등수학, etc.)
- Replace biased primary button with neutral card-click interaction
- Add scrollable name lists with max-height
- Add session sync warning banner"
```

---

## Task 5: UI 브라우저 검증 (Playwright MCP)

CLAUDE.md § UI Verification Protocol에 따라 브라우저 검증 필수.

- [ ] **Step 1: dev 서버 시작**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npm run dev
# → http://localhost:3000
```

- [ ] **Step 2: Playwright MCP로 충돌 모달 트리거 상태 확인**

충돌 모달은 로그인 전 데이터가 있을 때만 표시되므로, 개발 시 직접 렌더링 테스트가 필요하다. `layout.tsx`에서 `conflictState`를 임시로 강제 주입하거나, 브라우저 콘솔에서 localStorage를 조작한다:

```javascript
// 브라우저 콘솔에서 실행 — 익명 데이터 임의 주입
localStorage.setItem("classPlannerData:anonymous", JSON.stringify({
  students: [{"id":"s1","name":"김철수"},{"id":"s2","name":"이영희"}],
  subjects: [{"id":"sub1","name":"피아노","color":"#f00"},{"id":"default-1","name":"초등수학","color":"#fbbf24"}],
  sessions: [{"id":"sess1","weekday":0,"startsAt":"09:00","endsAt":"10:00"}],
  enrollments: [],
  version: "1.0",
  lastModified: new Date().toISOString()
}));
```

그 다음 Google/Kakao 로그인 → 충돌 모달 렌더 확인.

- [ ] **Step 3: 데스크탑 뷰 — 카드 클릭 동작 확인**

`mcp__playwright__screenshot`으로 캡처 후 확인:
- 좌우 카드 동일한 스타일
- 디폴트 과목(초등수학)이 과목 목록에 없는지
- 카드 hover/selected 상태 시각적 확인

- [ ] **Step 4: 모바일 뷰 — 탭 전환 확인**

Playwright 뷰포트를 375×667로 변경 후:
- 카드 그리드가 숨겨지고 탭이 표시되는지
- 로컬/서버 탭 전환 동작

- [ ] **Step 5: UI Verification Report 작성 후 완료**

```
## UI Verification Report

### 1차 — Playwright MCP
- Flows tested: 데스크탑 카드 클릭, 모바일 탭 전환, 디폴트 과목 필터
- Screenshots: [캡처 경로]
- Issues found: None / [목록]
```
