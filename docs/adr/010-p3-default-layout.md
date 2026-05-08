# ADR-010: P3 Layout을 Default로 승격

## Status
Accepted (2026-05-08)

## Context

ADR-009 (2026-05-07)는 P3 layout (Hide-on-Scroll 헤더 + Floating Bottom Toolbar
+ PrimarySidebar + 통합 필터 popover + auto colorBy)을 **opt-in**(`?layout=p3`
또는 localStorage)으로 도입했다. 1주간 사용자 검증 + dogfooding 결과:

- 학생 30+명 환경에서 메인 콘텐츠(시간표) 가용 영역 증가 효과가 명확
- Sticky 헤더 + Hide-on-Scroll로 scroll 재방향 부담 감소
- 통합 필터(학생/과목/강사) + auto colorBy로 기존 ColorByToggle/StudentFilterChipBar/
  TeacherFilterChipBar 3-way UI가 한 popover로 단순화
- A/B 토글로 default와 P3를 즉시 비교했을 때 P3 선호 명확

P3와 default를 동시 유지하는 비용:
- `page.tsx`에 `isP3` 분기 약 10곳, `TimeTableGrid` 1곳, CSS 4곳
- `StudentFilterChipBar`, `TeacherFilterChipBar` 두 atom + 관련 import/test mock
- ColorByToggle 분리 path

이 dual-maintenance 비용이 안정성 안전망(opt-in 단계의 가치)을 초과.

## Decision

P3를 `/schedule` default로 승격. Minimal 단계로 진행 (회귀 위험 분산).

### Step 1 — Default flip (이번 PR)
- `useScheduleLayout` 우선순위 변경: query > stored > **"p3"**
- localStorage storage 의미 반전:
  - "p3" 저장 = `removeItem` (default라 저장 불필요)
  - "default" 저장 = explicit opt-out
- `setScheduleLayoutPreference` 동작 반전 + ADR 코멘트
- 분기 코드/CSS/dead component는 **그대로 유지** (회귀 시 즉시 revert 가능)

### Step 2 — Dead code 정리 (별도 후속 PR, 1주 안정성 확인 후)
- `isP3` 분기 모두 제거
- `StudentFilterChipBar`, `TeacherFilterChipBar` atom 삭제
- ColorByToggle 분리 path 정리
- `?layout=default` back-out도 함께 제거 (또는 readonly fallback으로 유지 결정)

### Back-out (이번 PR 단계에서 유지)
- `?layout=default` query로 즉시 default layout 전환
- localStorage `class_planner_schedule_layout = "default"`로 영구 유지

## Consequences

### Positive
- 새 사용자 진입 즉시 P3 경험 — 학습 비용 ↓
- ADR-009의 "opt-in" 결정의 자연스러운 다음 단계
- A/B 토글 비용(이중 분기) 향후 PR로 청산

### Negative / Risks
- localStorage에 "default" 잔류한 익명 사용자(이전에 default를 explicit
  선택)는 변경 안 보임. **의도된 동작** (explicit override 존중).
- Mobile viewport(<768px)에서 PrimarySidebar/FloatingToolbar의 동작 검증
  추가 필요 (Playwright 모바일 모드 + computer-use)
- PDF export 경로(`PdfRenderer`)는 useScheduleLayout 미사용 — 영향 없음 (확인됨)

### Rejected alternatives
- **Full simplify 동시 진행**: 회귀 시 revert 단위가 비대 → minimal로 분리.
- **localStorage 기존 default 자동 wipe migration**: 사용자 explicit 선택을
  무시. "왜 갑자기 바뀜?" 신뢰 비용 ↑ → 미채택.
- **P3-only (back-out 제거)**: 1주 안정 검증 가치 > UI 삭제 가치 → minimal
  단계는 back-out 유지.

## References
- ADR-009: Schedule 운영시간 customization + Layout 자유도 (P3 도입)
- learning-journal/2026-05-07.md — A/B 토글 + visual companion 검증 기록
