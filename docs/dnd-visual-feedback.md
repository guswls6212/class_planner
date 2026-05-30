# DnD Visual Feedback — 시각 피드백 SSOT

class-planner 시간표(`/schedule`)에서 수업 블록(SessionBlock)을 드래그할 때 사용자에게 보이는 3 종 시각 피드백의 공식 명칭 / 데이터 흐름 / 좌표 anchor 규약. UI_SPEC.md 의 보조 문서.

## 1. SSOT 3 종 명칭

| # | 코드 식별자 | 렌더 위치 | 의미 |
|---|---|---|---|
| 1 | `data-testid="drag-ghost"` (DragGhost) | `TimeTableRow.tsx` § DragGhost block | 드래그 대상 블록의 **드롭 후 위치 미리보기**. 옮겨진 후 모습을 흐릿한 카드로 in-grid 렌더. |
| 2 | `data-testid="lane-highlight"` | `TimeTableRow.tsx` § 타겟 레인 하이라이트 block | **현재 hover 중인 lane 박스 강조**. 항상 column 박스 형태 (사용자 직관 "어느 lane 으로 드롭"). |
| 3 | `data-testid="amber-overlay"` ("여기 삽입") | `TimeTableRow.tsx` § amber overlay block | **lane 사이 명시적 삽입 안내** (Variant E). 노란 점선 박스 + boundary glow line. `targetMode === "insertBefore"` 시에만. |

## 2. 사용자 3 종 외 추가 시각 피드백

| 식별자 | 위치 | 역할 |
|---|---|---|
| `DragOverlayCard` (dnd-kit `<DragOverlay>`) | `TimeTableGrid.tsx` 하단 | 마우스 cursor 에 정확히 lock 되는 카드 (dnd-kit 표준). lane snap 없이 마우스 위치 그대로. |
| `data-testid="drag-source"` | `TimeTableRow.tsx` § Source placeholder | 다른 weekday 로 이동 시 원래 자리에 페이드 박스. source location 식별. |
| `data-testid="lane-boundary-N"` | `TimeTableRow.tsx` § 레인 경계선 | 정적 lane 경계 가이드 (얇은 vertical line). drag 중 일관성 보조. |
| Column inner glow (boxShadow) | `TimeTableRow.tsx` § div root style | target weekday 컬럼 자체 강조 (1.5px inset border). |
| `DRAG_HOVER_PAD` (column +20px 확장) | `TimeTableGrid.tsx weekdayWidths` | 드래그 중 target column 양옆 10px 패딩. drop 의도 명시성 ↑. |

## 3. 데이터 흐름 (SSOT chain — Non-negotiable)

```
user drag
    ↓
dnd-kit DndContext.onDragOver
    ↓
TimeTableGrid.handleDndDragOver(over.id)
    ↓ parse "weekday|time|yPos|leftHalf?|rightHalf?"
    ↓ NaN 가드 → invalid 시 leaveTarget()
    ↓ leftHalf  → hoverTarget(wd, t, yPos,   "insertBefore", "left")
    ↓ rightHalf → hoverTarget(wd, t, yPos+1, "insertBefore", "right")
    ↓ none      → hoverTarget(wd, t, yPos,   "lane")
useDragController (state machine)
    ↓ exposes: targetWeekday, targetTime, targetYPosition, targetMode, targetHalf
TimeTableGrid:
    ├─ sessionsForRender = computeTentativeLayout(..., { targetMode })   ← lane 시뮬레이션
    ├─ dragPreviewProp   = useMemo({ ..., targetMode, targetHalf })       ← stable prop
    └─ frozenLaneCountsPerWeekday (drag 시작 시 latch)                    ← cell flicker 방지
        ↓ prop drilling
TimeTableRow:
    ├─ laidOutSessions  ← sessionsForRender 의 weekday 부분, lane / top / height 계산
    ├─ ghostLayout     = laidOutSessions.find(ds.id)                       ← SSOT 좌표
    ├─ effectiveLanes  = max(frozenLanes, computeRequiredLanes(...))      ← flicker 가드
    ├─ drag-ghost      (left/top/width/height = ghostLayout)               ← #1
    ├─ lane-highlight  (left/width = ghostLayout, fallback raw targetYPos) ← #2
    └─ amber overlay   (left/top/width/height = ghostLayout, glow=half)    ← #3

TimeTableCell:
    └─ leftHalfDrop / rightHalfDrop (useDroppable hit-test only — visual X)
```

**Invariant**: 3 시각 피드백 모두 같은 `ghostLayout = laidOutSessions.find(ds.id)` 좌표 derive → 같은 frame 에 같은 픽셀로 갱신. compactYPositions artifact (lane 1 출발 + insertBefore=2 시 ghost yPos→1 compact) 도 자동 흡수.

## 4. lane-highlight — 항상 박스

`dragPreview.targetMode` 에 의한 시각 분기 **폐기** (이전 PR #390 의 vertical line 패턴 revert). lane-highlight 는 **항상 column 박스**:

- 색상 / 테두리는 mode 와 무관 (반투명 파란 박스 + border-left/right 1.5px).
- 위치 / 너비는 `ghostLayout` 우선 (post-shift, compactYPositions 후의 movingSession lane). `ghostLayout === null` 시 raw `targetYPosition` fallback.

이유: vertical line 은 "lane 사이 boundary" 의미를 가지지만, 사용자는 박스 형태 (= "이 lane 으로 드롭") 가 더 직관적. amber overlay 도 같은 lane (ghost lane) 에 그려지므로 박스 형태로도 시각 일관 — 중복은 ghost zIndex 200 이 위에서 가림.

## 5. 좌표 anchor 규약 (Non-negotiable)

3 SSOT 의 anchor 픽셀은 **모두 `ghostLayout` (laidOutSessions ghost) 의 `left/top/width/height`** 이어야 한다.

| SSOT | 좌표 source | 비고 |
|---|---|---|
| #1 drag-ghost | `ghostLayout.left + 1`, `ghostLayout.top + 1`, `ghostLayout.width - 2`, `ghostLayout.height - 2` | border offset |
| #2 lane-highlight | `ghostLayout.left`, `top:0`, `width: ghostLayout.width`, `bottom:0` | row 전체 높이 사용 (column 박스) |
| #3 amber overlay | `ghostLayout.left`, `ghostLayout.top`, `ghostLayout.width`, `ghostLayout.height` | ghost 와 동일 |

`ghostLayout === null` 시 (드래그 시작 직후 또는 cross-weekday 직전 transient) lane-highlight 만 raw `targetYPosition` fallback 으로 그려짐. amber 는 미렌더.

## 6. amber overlay — Variant E "여기 삽입"

표시 조건 (모두 만족 시):
- `dragPreview.targetWeekday === weekday`
- `dragPreview.targetMode === "insertBefore"`
- `!dragStartedAsCopy` (Cmd/Ctrl 복사 모드 시 X — T10b 가드)
- `selectedSessionIds.size <= 1` (multi-select 시 X — T10b 가드)
- `ghostLayout` 존재

위치: ghostLayout 좌표. boundary glow:
- `targetHalf === "left"` → 박스의 왼쪽 edge 에 `w-1` amber glow line
- `targetHalf === "right"` → 박스의 오른쪽 edge 에 `w-1` amber glow line

zIndex 4 (lane-highlight 95 보다 아래지만 ghost lane 에 SessionBlock 이 없으므로 충돌 X). ghost zIndex 200 이 위에서 살짝 가려도 ghost 반투명이라 amber border 비춰 보임.

## 7. effectiveLanes freeze (transient flicker 방지)

drag 시작 시 TimeTableGrid 가 weekday 별 lane 수를 `frozenLaneCountsPerWeekday` state 에 latch. drag 중 `effectiveLanes = max(frozenLanes, computeRequiredLanes(...))` 로 줄어듦 차단.

이유: cell mount/unmount 시 dnd-kit `useDroppable` 재등록까지 1 frame 지연 → cell.isOver flicker → over 갱신 지연 → 3 시각 피드백 transient mismatch. lane 수 줄어듦을 막으면 cell 안정성 ↑.

늘어남은 허용 (insertBefore 시 +1 등) — 새 cell mount 후 다음 frame 에 안정.

## 8. NaN 가드

`handleDndDragOver` 의 `over.id` parse 결과 `yPos` 또는 `weekday` 가 `!Number.isFinite()` 시 `leaveTarget()` 호출. 비정상 `over.id` (빈 segment, 잘못된 droppable id 등) 로 dragController state 오염 방지.

## 9. 한계 / 트레이드오프

**100% 동기 보장 X, ~98% 가능.** dnd-kit `useDroppable` 등록 + React reducer dispatch 가 같은 onDragOver event 에서 갱신되지만, 내부 subscriber 가 다른 task 로 batched 될 수 있어 1-frame transient flicker 가능. `effectiveLanes` freeze + ghost SSOT derive 로 사용자 인지 가능한 mismatch 는 사실상 제거.

추가 SSOT 강화 후보 (별도 PR 대상):
- dnd-kit 의 `over` ref 직접 read (internal API 의존 → 위험)
- React 18 `flushSync` 로 강제 동기 update (perf hit 가능)
- TimeTableRow / TimeTableGrid 분할 (~700-829 lines → 300 lines × 3) — 코드 가독성 ↑, 본 변경의 RC 진단 비용 ↓.

## 10. 변경 history

- **PR #244** (2026-05): Variant E 도입 — cell split + amber `여기 삽입` overlay.
- **PR #389** (2026-05-13): cell-split unique droppable id (lane mismatch 회귀 가드).
- **PR #390 (1차)** (2026-05-15): `dragPreview` 에 `targetMode` plumbing + lane-highlight mode 분기 (insertBefore → vertical line). docs § 4/5 신설.
- **PR #390 (2차, 이 변경)** (2026-05-15): 사용자 본인 브라우저 검증 후 mismatch 재보고 (`compactYPositions` artifact = Case B). 통합 SSOT 로 전환:
  - `lane-highlight` 박스 revert + `ghostLayout` 좌표 derive
  - `amber overlay` TimeTableCell→TimeTableRow 이동 + ghost 좌표 derive
  - `dragController` 에 `targetHalf` 추가 (left/right glow)
  - `effectiveLanes` freeze (cell flicker 가드)
  - NaN 가드 (`handleDndDragOver`)
  - 이 문서 전면 재작성

## 11. 테스트 회귀 가드

`src/components/molecules/__tests__/TimeTableRow.test.tsx` § "드래그 중 레인 시각화":
- `targetMode=insertBefore` → lane-highlight 박스 (width != 3px, data-mode 속성 없음)
- `targetMode=lane` / undefined → lane-highlight 박스 (legacy backward compat)
- `targetMode=insertBefore` + `targetHalf="left"` → amber-overlay 렌더 (data-target-half="left")
- `targetMode=insertBefore` + `targetHalf="right"` → amber-overlay data-target-half="right"
- `targetMode=lane` → amber-overlay 미렌더
- multi-select → amber-overlay 미렌더 (T10b 가드)
- `dragStartedAsCopy` → amber-overlay 미렌더 (T10b 가드)

E2E (Playwright + computer-use): `/schedule` 에서 SessionBlock 드래그 → ghost / lane-highlight / amber overlay 픽셀 anchor 일치 + 마우스 따라 같이 움직임. 데이터 의존성 큼 — 사용자 본인 브라우저 검증 우선.
