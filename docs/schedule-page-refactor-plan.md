# schedule/page.tsx Refactor Plan — Step 1 분석 결과

> Sub-proposal: [`schedule-page-split-refactor`](../../proposed-tasks/class-planner/schedule-page-split-refactor.md) Step 1
>
> **Status**: Step 1 분석 완료 (2026-05-27). Step 2-9 채택 대기.

## 1. Metrics (Observation)

| 항목 | 값 |
|---|---|
| 줄 수 | **3219** |
| import | 69 줄 |
| useState | ~30 |
| useEffect | 14 |
| useCallback | 27 |
| useMemo | 20 |
| handle\* function | 27 |
| 책임 group | 9 |
| 목표 줄 수 | ~600-800 |

## 2. State + Handler Grouping (책임별)

### Group A — academy & user (Layer 0, 추출 X)
- `activeAcademyId` (line 265) + setter
- `userId` (line 249, derived from authUser)

→ schedule page 의 base context. 추출 의미 X.

### Group B — UI state (Layer 1, 추출 X)
- `sidebarOpen` (867)
- `headerScrolled` (1130)
- `tourActive` (1131)

→ 가볍고 cross-cutting. page-local 유지.

### Group C — Filters
- `selectedStudentIds` / `selectedSubjectIds` / `selectedTeacherIds`
- `colorBy` mode
- 관련 toggle / clear handlers

**추출 → `hooks/useScheduleFilters.ts`**
- 의존: students/subjects/teachers (read-only)
- 다른 group 영향: 약함 (filter 결과는 derived state)

### Group D — Modals
- `showGroupModal` / `groupModalData` / `groupTimeError` (1170-1175)
- `isPdfDialogOpen` / `pdfInitialScope` / `pdfInitialPrintTarget` (2013-2018)
- `showSavePickerModal` / `showApplyPickerModal` / `applyConfirmTemplate` / `isApplyingTemplate` / `previewTemplate` (2284-2288)
- `attendanceSession` (2501)
- (그 외 편집 모달 state — useScheduleModals 통합 후보)

**추출 → `hooks/useScheduleModals.ts`** (또는 group 별 별도 — useTemplateModals / useAttendanceModal / usePdfModal)
- 의존: session data + handlers
- 다른 group 영향: medium (modal open trigger 가 여러 handler 에서)

### Group E — Template
- State: `showSavePickerModal` / `showApplyPickerModal` / `applyConfirmTemplate` / `isApplyingTemplate` / `previewTemplate`
- Handler: `handleApplyTemplate` (2393) / `handleSaveSlot` (2422) / `handleApplySlot` (2484) / `handlePreviewTemplate` (2494)

**추출 → `hooks/useTemplateController.ts`**
- 의존: sessions / weekStartDate / 학생-과목-강사 data
- 다른 group 영향: 약함 (template 가 independent feature)

### Group F — Picker inline create
- State: `studentInputValue` / `studentCreating` / `studentCreateError` (1200-1202)
- State: `teacherInputValue` / `teacherCreating` / `teacherCreateError` (1205-1207)
- State: `subjectInputValue` / `subjectCreating` / `subjectCreateError` (1208-1210)
- State: `tempTeacherId` (1242)
- Handler: `handleCreateStudentFromInput` (1376) / `handleCreateTeacherFromInput` (1405) / `handleCreateSubjectFromInput` (1435)
- Handler: `handleEditStudentInputChange` (1300) / `handleEditStudentAdd` (1306) / `handleEditStudentAddClick` (1327) / `handleEditCreateStudentAndAdd` (1335) / `handleStudentInputKeyDown` (1520)

**추출 → `hooks/usePickerInlineCreate.ts`** (또는 entity 별로 — useStudentPicker / useTeacherPicker / useSubjectPicker)
- 의존: students/teachers/subjects + apiSync
- 다른 group 영향: 약함 (picker 가 self-contained)

### Group G — Drag/Drop
- Handler: `handleDrop` (1675) / `handleSessionDrop` (1693) / `handleSessionCopy` (1787)
- Handler: `handleContextMenuCopy` (1955)
- Handler: `handleSessionInsertBefore` (807)
- Handler: `handleDragStart` (2535) / `handleDragEnd` (2544) (student drag)
- State: dragController / dragPreview / dragStartedAsCopy

**추출 → `hooks/useScheduleDragDrop.ts`**
- 의존: sessions / dragController / dragPreview / sessionMove
- 다른 group 영향: medium (drag 결과가 session state 변경 — apiSync 호출)

### Group H — Bulk Operations
- Handler: `handleBulkDelete` (316) / `handleContextMenuStartSelect` (324) / `handleClearWeek` (2404)
- State: selectedSessionIds / multi-select mode

**추출 → `hooks/useBulkSessionOps.ts`**
- 의존: selectedSessionIds + sessions + apiSync
- 다른 group 영향: 약함

### Group I — Session CRUD (orchestration)
- Handler: `handleSessionClick` (2003) / `handleSessionDelete` (829) / `handleEmptySpaceClick` (1972)
- State: `isSyncingSession` (1190)

**page 안 유지** — orchestration 역할. 단 helper 함수는 _utils/ 로 이동 가능.

### Group J — Attendance
- State: `attendanceSession` (2501)
- Handler: `handleOpenAttendance` (2505)
- Hook: `useAttendance` (line 2502-2503)

**추출 → `hooks/useAttendanceController.ts`**
- 의존: useAttendance + sessions + selectedDate + role / linkedTeacherId
- 다른 group 영향: **medium** (attendance-block-visual-feedback Step 2B 가 이 group 확장)

### Group K — PDF Export
- State: `isDownloading` (2013) / `isPdfDialogOpen` (2014) / `pdfInitialScope` / `pdfInitialPrintTarget` (2015-2018)
- Handler: `handlePdfExport` (2139)

**추출 → `hooks/usePdfExport.ts`**
- 의존: sessions + 학생-과목-강사 data
- 다른 group 영향: 약함

## 3. 의존성 graph (추출 순서)

```
Layer 0 (base):
  - academy & user state, session data, helper utils (이미 있음)

Layer 1 (independent — 먼저 추출):
  - useScheduleFilters (C)        ← 의존 약함
  - usePdfExport (K)              ← 의존 약함
  - useTemplateController (E)     ← independent feature
  - usePickerInlineCreate (F)     ← independent feature

Layer 2 (medium dependency):
  - useBulkSessionOps (H)         ← selectedSessionIds + sessions
  - useAttendanceController (J)   ← useAttendance + sessions + role

Layer 3 (high dependency):
  - useScheduleDragDrop (G)       ← dragController + sessions + apiSync
  - useScheduleModals (D)         ← 다른 group 의 trigger 와 결합

Layer 4 (orchestration):
  - page.tsx 본체 (Group I)       ← 다른 hook 들 조립 + JSX
```

## 4. 단계별 PR Plan

| PR | Step | 추출 대상 | 변경 줄 수 (추정) | dependency |
|---|---|---|---|---|
| PR 1 | Step 2 | useScheduleFilters (C) | -200 / +100 | independent |
| PR 2 | Step 3 | usePdfExport (K) | -150 / +80 | independent |
| PR 3 | Step 4 | useTemplateController (E) | -300 / +180 | independent |
| PR 4 | Step 5 | usePickerInlineCreate (F) | -250 / +150 | independent |
| PR 5 | Step 6 | useBulkSessionOps (H) | -150 / +90 | medium |
| PR 6 | Step 7 | useAttendanceController (J) | -100 / +120 | medium (Step 2B 통합 포함) |
| PR 7 | Step 8 | useScheduleDragDrop (G) | -400 / +250 | high |
| PR 8 | Step 8 | useScheduleModals (D) | -300 / +200 | high (다른 hook 와 결합) |
| PR 9 | Step 9 | Sub-components 추출 (ScheduleToolbar / ScheduleModalsRoot) | -400 / +500 (별도 file) | UI 분리 |
| **합계** | | | **-2250 / +1670** (3219 → ~700-800 줄) | |

## 5. 각 hook 의 signature (제안)

### useScheduleFilters
```ts
function useScheduleFilters(): {
  selectedStudentIds: string[];
  selectedSubjectIds: string[];
  selectedTeacherIds: string[];
  colorBy: ColorByMode;
  toggleStudent: (id: string) => void;
  toggleSubject: (id: string) => void;
  toggleTeacher: (id: string) => void;
  clearAll: () => void;
  setColorBy: (mode: ColorByMode) => void;
};
```

### useAttendanceController
```ts
function useAttendanceController(params: {
  userId: string | null;
  sessions: Session[];
  selectedDate: Date;
  role: Role;
  linkedTeacherId: string | null;
}): {
  attendanceSession: Session | null;
  attendanceSummaryMap: Record<string, { checked: number; total: number; hasAbsent: boolean }>;
  openAttendance: (session: Session) => Promise<void>;
  closeAttendance: () => void;
  markAttendance: typeof useAttendance.markAttendance;
  markAllPresent: typeof useAttendance.markAllPresent;
};
```

→ attendance-block-visual-feedback Step 2B 가 본 hook 의 `attendanceSummaryMap` 으로 자연 통합.

### useScheduleDragDrop
```ts
function useScheduleDragDrop(params: {
  sessions: Session[];
  onSessionMove: (params: SessionMoveParams) => Promise<void>;
  onSessionCopy: (params: SessionCopyParams) => Promise<void>;
  canManage: boolean;
}): {
  dragController: DragController;
  dragPreview: DragPreview | null;
  dragStartedAsCopy: boolean;
  handleDrop: (...) => void;
  handleSessionDrop: (...) => void;
  handleSessionCopy: (...) => void;
  handleContextMenuCopy: (...) => void;
  handleSessionInsertBefore: (...) => void;
};
```

## 6. 회귀 가드

각 PR 별로:
- [ ] `npm run check:quick` 통과 (tsc + unit)
- [ ] 기존 schedule e2e (Playwright) 통과 — 변경 group 영향 spec 우선
- [ ] UAT smoke test — owner 계정 schedule 진입 + 해당 group 동작 (filter / template / attendance / drag / pdf / picker / bulk)
- [ ] PR review — 한 PR = 한 hook 의 추출 (review 부담 최소)

## 7. attendance-block-visual-feedback Step 2 와 통합

본 refactor 의 **PR 6 (useAttendanceController)** 안에서 Step 2B 자연 통합:
- 기존 `useAttendance` 의 sessionId 별 fetch
- 새 `attendanceSummaryMap` derive 추가 — 현재 sessions × selectedDate 의 모든 session 의 summary aggregation
- `SessionBlock` 에 `attendanceSummary={attendanceSummaryMap[session.id]}` prop 전달

Step 2C (EditSessionModal Variant B) 는 `useScheduleModals` 의 편집 모달 안 cycle pill — 별도 PR 또는 PR 8 안 통합.

## 8. 예상 일정

| Phase | 시간 |
|---|---|
| Step 1 (분석, 본 docs) | 완료 (1h) |
| Step 2-5 (PR 1-4 independent) | 2-3h |
| Step 6-7 (PR 5-6 medium) | 1.5-2h |
| Step 8 (PR 7-8 high dependency) | 2-3h |
| Step 9 (sub-components + 검증) | 1h |
| **합계** | **6.5-9h** (proposal 의 6-10h 범위 안) |

## 9. 권장 진행 시점

- **Phase 1 production release + friend 선공개 안정화 후**
- 또는 사용자 결정 — friend 선공개 일정 연기 + refactor 우선

### Devil's Advocate
- friend 선공개 우선 vs refactor 우선:
  - **우선 release**: AI 작업 quality 누적 손해 + 매 변경 risk 누적
  - **우선 refactor**: friend 선공개 일정 연기 + 본 작업 의 의도 (1 click 출석 체크 등) 늦어짐
- 사용자 결정 — friend 선공개 연기 가능성 명시 (2026-05-27)

## 10. 다음 행동

- [ ] 사용자 OK 시 Step 2 (PR 1, useScheduleFilters) 시작
- [ ] 또는 본 docs 의 grouping 사용자 검토 후 boundary 조정
