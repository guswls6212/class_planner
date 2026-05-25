# 출결 기능 Phase 2 보강 (future-work)

> **Phase 1 적용 범위** (rank 6, PR `feat/attendance-discoverability`):
> - `/attendance` 페이지 신규 — 오늘/이번 주 sessions list + AttendanceSheet modal
> - Sidebar 메뉴 entry 추가 (ClipboardCheck icon, "출결")
> - settings 페이지 데이터 복구 amber hint 카드
>
> **본 doc**: Phase 1 에서 의도적 제외된 Phase 2 보강 항목. 친구 학원 운영자 실 사용 1-2주 + reporting 요청 발생 시 채택.

## 진입 trigger

다음 중 1개 이상 충족 시 본 doc 의 Phase 2 작업 채택 검토:

- 친구 학원 운영자가 "이번 달 출결 통계" 또는 "결석 자주 하는 학생" 같은 reporting 요청
- 학원 운영자가 학부모에게 출결 자료 전달 필요 (CSV export)
- Phase 2 광고 진입 (학원 N개) — reporting 기능이 paid plan 의 차별화 요소

## 보강 항목

### 1. 학생 detail panel 출결 stat 1줄

**Scope**: `StudentsPageLayout` 의 `StudentDetailPanel` 안에 "총 출결 N회 / 결석 M회 / 출결률 X%" 표시.

**가치**: 학생 detail 진입한 사용자 (이미 관심 학생) 의 정보 통합. 학생 list 카드는 layout 비대화 + N+1 query 우려라 detail 만.

**구현**:
- `useAttendance` 확장 또는 별도 `useStudentAttendanceStats(studentId)` hook
- 출결 데이터 aggregation (이번 달 default + 직전 3개월 toggle)
- 출결률 색상 (≥90% emerald / 70-90% amber / <70% red)
- mini bar chart (옵션) — 주별 출결률 추이

**예상 분량**: 반나절-1일

### 2. 학생 list 출결 stat (학생 page list 카드)

**Scope**: `/students` 페이지 list 의 각 학생 카드에 "출결 12/14" 같은 stat.

**가치**: 한눈에 출결률 낮은 학생 발견. 학원 운영자 reporting 효율 ↑.

**부작용 + 결정 사항**:
- N+1 query 회피 — 학원 전체 출결 stat batch fetch (1 query 로 모든 학생 출결 누적)
- layout 비대화 — stat 표시는 toggle 또는 hover-only 옵션
- 학생 N=100+ 학원 의 list 성능

**구현**:
- `/api/attendance/stats/students?academyId=X&period=current_month` batch endpoint
- list 의 각 학생 카드에 stat 표시
- toggle: "출결 표시 / 숨기기" Sidebar 상단

**예상 분량**: 1일

### 3. /attendance 페이지 — 월별/주별 출결 view

**Scope**: `/attendance` 페이지에 view toggle (일별 — Phase 1 default / 주별 / 월별).

**가치**: 학원 운영자가 학생별 출결 추이 한눈에 파악. 결석 패턴 발견 (특정 요일/시간 자주 결석 등).

**구현**:
- Matrix view (학생 N × 세션 M, 또는 학생 N × 날짜 D)
- 출결 상태 색상 cell
- Period selector (이번 달 / 직전 3개월 / 사용자 지정 range)

**예상 분량**: 1-2일

### 4. 결석 alert

**Scope**: 학생이 3회 이상 연속 결석 또는 월 출결률 50% 미만 시 학원 운영자 알림.

**가치**: 학원 운영자가 학생 이탈 위험 조기 인지. 학부모 communication trigger.

**구현**:
- `notification_history` 테이블 (이미 존재) 에 출결 alert event 추가
- bell icon (Sidebar 상단) — `useNotifications` 같은 hook
- alert 트리거: cron 또는 출결 mark 시 즉시 평가

**예상 분량**: 1-2일

### 5. 출결 CSV / PDF export

**Scope**: 학원 운영자가 "이번 달 출결 자료" 를 학부모 또는 본인 백업 용으로 export.

**가치**: 학원 reporting 의 핵심 요구. 학부모 통신 또는 학원 내부 documentation.

**구현**:
- `/api/attendance/export?academyId=X&period=Y&format=csv|pdf`
- CSV — Excel friendly (UTF-8 BOM)
- PDF — printable layout (학원 로고 + 월별 출결표)

**예상 분량**: 1-2일

### 6. AttendanceSheet 의 bulk-mark 확장

**Scope**: "전체 출석" 외 "전체 결석" / "전체 지각" 같은 bulk 액션. 그룹 수업 (학생 N명) 빠른 입력.

**가치**: 학원 운영자 입력 시간 ↓.

**예상 분량**: 반나절

### 7. 출결 history undo / 시점 복원

**Scope**: 잘못 mark 한 출결을 5초 undo (현재 mark 후 즉시 fix).

**가치**: 실수 입력 회복.

**구현**:
- 기존 `pendingDeletes` 패턴 차용
- toast `showActionToast({ message: "...", action: "취소", onAction: revertAttendance })`

**예상 분량**: 반나절

## 우선순위 권장

| 우선순위 | 항목 | 채택 trigger | 분량 |
|---|---|---|---|
| 1 | 학생 detail panel 출결 stat (#1) | 친구 reporting 요청 시 즉시 | 반나절-1일 |
| 2 | 출결 CSV export (#5) | 학원 운영자 학부모 통신 요청 시 | 1-2일 |
| 3 | 결석 alert (#4) | 학생 이탈 사례 발생 시 | 1-2일 |
| 4 | /attendance 월별 view (#3) | reporting 자주 요청 시 | 1-2일 |
| 5 | 학생 list 출결 stat (#2) | Phase 2 광고 진입 시 (학원 N개) | 1일 |
| 6 | AttendanceSheet bulk 확장 (#6) | 그룹 수업 N명 학원 진입 시 | 반나절 |
| 7 | 출결 undo (#7) | 사용자 사고 보고 시 | 반나절 |

## 관련

- Phase 1 적용: `proposed-tasks/class-planner/phase1-production-release.md` § Step 1.4 (재정의), `/strategy/phase1-release-readiness` Top 10 § rank 6
- Phase 1 mockup: `/strategy/discoverability-attendance-recovery` (4 variant 비교, A1+A2+E 결합 채택)
- 데이터 model: `src/hooks/useAttendance.ts`, `src/components/molecules/AttendanceSheet.tsx`, API `/api/attendance`, `/api/attendance/bulk`
