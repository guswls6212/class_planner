# DnD Visual Feedback — 시각 피드백 SSOT

class-planner 시간표(`/schedule`)에서 수업 블록(SessionBlock)을 드래그할 때 사용자에게 보이는 3 종 시각 피드백의 공식 명칭 / 데이터 흐름 / 좌표 anchor 규약. UI_SPEC.md 의 보조 문서.

## 1. SSOT 3 종 명칭

| # | 코드 식별자 | 렌더 위치 | 의미 |
|---|---|---|---|
| 1 | `data-testid="drag-ghost"` (DragGhost) | `TimeTableRow.tsx` § DragGhost block | 드래그 대상 블록의 **드롭 후 위치 미리보기**. 옮겨진 후 모습을 흐릿한 카드로 in-grid 렌더. |
| 2 | `data-testid="lane-highlight"` | `TimeTableRow.tsx` § 타겟 레인 하이라이트 block | **현재 hover 중인 lane 강조**. `targetMode`에 따라 시각 분기 (§ 4 참조). |
| 3 | `Edge Hover Slot` (Variant E) — `여기 삽입` amber overlay | `TimeTableCell.tsx` § insertMode overlay | **lane 사이 명시적 삽입 안내**. 노란 점선 박스 + boundary glow line. |

## 2. 추가 시각 피드백 (cell hit-test / column-level 보조)

3 SSOT 외 코드에 존재하는 시각 요소.

| 식별자 | 위치 | 역할 |
|---|---|---|
| `DragOverlayCard` (dnd-kit `<DragOverlay>`) | `TimeTableGrid.tsx` 하단 | 마우스 cursor에 정확히 lock 되는 카드 (dnd-kit 표준). lane snap 없이 마우스 위치 그대로. |
| `data-testid="drag-source"` | `TimeTableRow.tsx` § Source placeholder | 다른 weekday 로 이동 시 원래 자리에 페이드 박스. source location 식별. |
| `data-testid="lane-boundary-N"` | `TimeTableRow.tsx` § 레인 경계선 | 정적 lane 경계 가이드 (얇은 vertical line). 드래그 중 일관성 보조. |
| Column inner glow (boxShadow) | `TimeTableRow.tsx` § div root style | target weekday 컬럼 자체 강조 (1.5px inset border). |
| `DRAG_HOVER_PAD` (column +20px 확장) | `TimeTableGrid.tsx weekdayWidths` | 드래그 중 target column 양옆 10px 패딩. drop 의도 명시성 ↑. |

## 3. 데이터 흐름 (SSOT chain)

```
user drag
    ↓
dnd-kit DndContext.onDragOver
    ↓
TimeTableGrid.handleDndDragOver(over.id)
    ↓ parse "weekday|time|yPos|leftHalf?|rightHalf?"
    ↓ leftHalf  → hoverTarget(wd, t, yPos,   "insertBefore")
    ↓ rightHalf → hoverTarget(wd, t, yPos+1, "insertBefore")
    ↓ none      → hoverTarget(wd, t, yPos,   "lane")
useDragController (state machine)
    ↓ exposes: targetWeekday, targetTime, targetYPosition, targetMode
TimeTableGrid:
    ├─ sessionsForRender = computeTentativeLayout(..., { targetMode })   ← #1 drag-ghost 의 SSOT
    └─ dragPreviewProp   = useMemo({ ..., targetMode })                    ← #2 lane-highlight 의 SSOT
        ↓ prop drilling
TimeTableRow:
    ├─ drag-ghost       (yPos = laidOutSessions.find(ds).yPosition  ← sessionsForRender 기반)
    └─ lane-highlight   (yPos = dragPreviewProp.targetYPosition, mode = dragPreviewProp.targetMode)

TimeTableCell:
    └─ Edge Hover Slot  (leftHalfDrop.isOver / rightHalfDrop.isOver ← dnd-kit per-cell hit-test)
```

핵심: **3 SSOT 모두 dragController state(`targetWeekday/time/yPos/mode`) 와 `over.id` 의 같은 origin** 에서 파생. timing 불일치 없음.

## 4. targetMode 분기 — lane-highlight 시각 분기

`dragPreview.targetMode === "insertBefore"` 일 때 lane-highlight 는 **lane 경계 vertical line** 으로 렌더. 그 외 (`"lane"` 또는 undefined) 엔 **column 박스** 로 렌더.

이유: `insertBefore` 의 의미는 "lane N 앞에 새 lane 삽입" 이지 "lane N 자체에 occupy" 가 아니다. column 박스로 표시하면 ghost 위치(post-shift lane N) 와 시각 충돌 (`drag-ghost` 박스가 후보 자리에 있는데 `lane-highlight` 박스가 같은 자리에 또 있는 시각 중복).

vertical line 은 `(targetYPosition - 1) * laneWidth` 픽셀에 anchor — 이게 ghost 의 left edge + Edge Hover Slot amber boundary line 과 동일 픽셀이라 3 종이 같은 경계를 가리킨다 (§ 5).

## 5. 좌표 anchor 규약 (Non-negotiable)

`targetMode === "insertBefore"` 시 3 SSOT 의 anchor 픽셀은 **모두 `(targetYPosition - 1) * laneWidth + DRAG_HOVER_PAD`** 이어야 한다 (target weekday 기준).

| SSOT | anchor pixel 식 | 결과 |
|---|---|---|
| #1 drag-ghost left edge | `(insertBeforeYPos - 1) * laneWidth + PAD` (compactDay 후 post-shift) | `boundary` |
| #2 lane-highlight line 중심 | `(targetYPosition - 1) * laneWidth + PAD` (±1.5 boundary line width) | `boundary` |
| #3 amber boundary line (leftHalf) | cell N(=targetYPosition) 의 left = `(N - 1) * laneWidth` | `boundary` |
| #3 amber boundary line (rightHalf) | cell N 의 right = `N * laneWidth` = `(targetYPosition - 1) * laneWidth` (targetYPosition = N+1) | `boundary` |

`insertSessionAtLanePreview` 와 drop handler 가 같은 algorithm 이라 ghost 위치 ≡ 실제 drop 결과 invariant (PR #389 § cell split 시작 이후 항구). 새로 추가되는 시각 피드백은 이 anchor 식에 맞춰야 한다.

## 6. 알려진 한계 / 향후 개선 후보

- **Edge Hover Slot 의 amber 큰 박스(`bg-amber-300/25 border-dashed`)는 hover 중인 cell 위치(=cell N 의 lane 박스)에 그려진다.** rightHalf hover 시 ghost 박스(post-shift lane N+1) 와 amber 박스(lane N) 가 **인접한 다른 lane** 에 위치 — 두 박스의 boundary line 은 일치하지만 박스 자체는 시각 중복 아님.
  - 사용자 의도가 "ghost 박스 == amber 박스 같은 lane" 이라면 amber overlay 를 cell 단위 → row 단위로 옮겨서 `dragPreview.targetYPosition` 기반 렌더로 통일해야 함. PR #389 의 cell-split SSOT 와 trade-off 가 있어 별도 결정 필요.

- **DragOverlayCard (cursor-attached)** 는 항상 마우스 lock — lane snap 안 함. dnd-kit 표준 동작이며 이게 사용자에게 "내가 잡고 있는 것" 직관 제공. 이 카드와 in-grid drag-ghost 의 위치 차이는 의도된 디자인.

- **multi-select / Ctrl+Cmd 복사 모드** 시 `insertMode = false` (T10b 회귀 가드, PR #88 #128 cycle). amber overlay 미표시, lane-highlight 는 항상 `"lane"` mode column 박스로 렌더.

## 7. 변경 history

- **PR #244** (2026-05): Variant E 도입 — cell split + amber `여기 삽입` overlay
- **PR #389** (2026-05-13): cell-split unique droppable id (lane mismatch 회귀 가드)
- **PR (이번)** (2026-05-15): `dragPreview` prop 에 `targetMode` 추가, lane-highlight 를 mode-aware 로 분기, 본 문서 신설. 3 SSOT 시각 동기화 정합성 명문화.

## 8. 테스트 회귀 가드

- 단위: `src/components/molecules/__tests__/TimeTableRow.test.tsx` § "드래그 중 레인 시각화 — 경계선 + 하이라이트"
  - `targetMode=insertBefore` → `data-mode="insertBefore"` + `width: 3px`
  - `targetMode=lane` → `data-mode="lane"` + `width != 3px`
  - `targetMode undefined` → lane mode default (backward compat)
- E2E (Playwright): `/schedule` 페이지에서 SessionBlock 드래그 → ghost / lane-highlight / amber boundary 픽셀 anchor 일치 — 수동 검증 (computer-use 권장).
