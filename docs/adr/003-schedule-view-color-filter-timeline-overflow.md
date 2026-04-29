# ADR-003: 주간/일간/월간 시간표 색·필터·타임라인·오버플로우 통합 개선

**Status:** Accepted  
**Date:** 2026-04-29  
**Deciders:** HYUNJIN

## Context

class-planner 시간표 화면(`/schedule`)에서 발견된 4가지 버그와 1가지 UX 개선 요구사항을 처리하기 위해 통합 개선을 진행했다.

**버그:**
1. 학생 필터 모드 + 칩 미선택 시 색상이 학생 해시 색으로 바뀌고 그룹 수업 이름 사라짐
2. 3+ 동시 겹침 세션이 portal popover에 갇혀 그리드에서 직접 인지 불가
3. 현재 시각 타임라인이 마운트 후 고정 (실시간 이동 안 함)
4. 타임라인이 세션 블록에 가려짐 (z-index 10 vs 세션 100+)

**UX 개선:** 모던/우아한 Editorial 스타일 폴리시

## Decisions

### 1. 학생 모드 칩 미선택 → 과목 색 폴백
- **결정:** `resolveSessionColor`에 `selectedStudentIds?: string[]` 추가. 칩 미선택 시 학생 모드에서도 과목 색·라벨 출력
- **이유:** 사용자 멘탈 모델 일치 ("학생을 골라야 학생 시간표")

### 2. 학생 칩 선택 시 비선택 세션 dim
- **결정:** 비선택 세션 opacity 0.25, 선택 세션 학생색 outer glow ring (1.5px). 드래그 중 비활성.
- **이유:** 컨텍스트 보존 (다른 강의실 점유 인식) + 포커스 동시 제공
- **거부된 대안:** 비선택 세션 숨김 — 시간대별 충돌 인식 어려움

### 3. 일간/월간 뷰 Full Parity
- **결정:** colorBy 모드 + 학생 칩 dim/glow를 일간/월간에도 동일 적용. `SessionCard`에 `overrideColor`/`dimmed`/`highlighted` props 추가.
- **이유:** 뷰 전환 시 컨텍스트 유지
- **구현:** 부모(`ScheduleDailyView`, `MonthDayCell`)에서 resolvedColor/isDimmed 계산 → SessionCard에 경량 props 전달 (prop drilling, Context 없음)

### 4. Inline Overflow (portal 제거)
- **결정:** 최대 3 lane inline, 4+ 세션은 `+N` 인라인 칩으로 그리드 내 확장. `SessionOverflowPopover` (createPortal) 삭제.
- **이유:** 사용자 요청 ("팝업창 밖으로 빼서 표시") + PDF 인쇄·드래그 보존
- **거부된 대안:** 무제한 균등 분할 — 5+ 겹침 시 라벨 불가; 가로 스크롤 — PDF 잘림·드래그 충돌

### 5. 실시간 타임라인 (useNowMinute)
- **결정:** 분 boundary 동기화 hook (`setTimeout` → `setInterval` 60s + `visibilitychange` resync). z-index 150. amber HH:MM pill.
- **이유:** 마운트 후 고정 문제 해결 + "모던/우아한" 요구사항

### 6. Editorial Polish
- **결정:** 세션 블록 gradient + 좌측 stripe, 13px 타이포, hover ring, today 컬럼 amber wash, 정시/반시 라벨 계층화
- **이유:** UX 모던/우아함 요구사항 충족, PDF 인쇄 안전성 유지

## Consequences

**Positive:**
- 뷰 전환 시 색/필터 컨텍스트 완전 보존
- Portal 제거로 z-index 층위 단순화 (~130 LOC 삭제)
- 타임라인이 실시간 현황 반영

**Negative / Trade-offs:**
- Weekly 그리드가 이제 모든 세션을 렌더링 (비선택 포함) → 비선택 세션 수가 많을 때 렌더 비용 증가
- prop drilling 심화 (`selectedStudentIds` 흐름)
