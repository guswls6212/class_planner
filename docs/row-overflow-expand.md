# Row-Level Overflow Expand — 시간대별 '+N' / '−' 확장 정책

class-planner 시간표 (`/schedule`) 에서 한 weekday 안 4 개 이상 동시 lane 이 발생할 때 collapsed (3 lane 만 표시) / expanded 토글 정책. 사용자 보고 (2026-05-15, Image #9) 기반으로 **column 단위 → row(cluster) 단위** 로 전환.

## 1. 데이터 모델 — SessionCluster

`src/lib/sessionClusters.ts` § `computeRowClusters(sessions)`:

같은 weekday 의 sessions 를 **시간 겹침 기반 connected components** 로 그룹화. 두 sessions 가 시간 겹치면 같은 cluster, transitively connected:

```
A 10:00-11:00 ↔ B 10:30-12:00 ↔ C 11:30-13:00 → A,B,C 한 cluster
(A 와 C 는 직접 안 겹쳐도 B 가 다리)
```

각 cluster:
- `key: string` — cluster 의 startMin (string). 같은 weekday 내 unique.
- `startMin / endMin` — 시간 범위 (minute since midnight).
- `sessions` — cluster 멤버 sessions (startMin asc 정렬).
- `requiredLanes` — cluster 내 max 동시 lane (≥1).

Algorithm: sweep-line. weekdaySessions 를 startMin asc 정렬 → 진행 중 cluster endMin 추적 → 다음 session startMin < cluster.endMin 이면 같은 cluster, 아니면 새 cluster.

## 2. expand State — cluster 단위

`expandedRows: Set<string>` (TimeTableGrid.tsx) — key = `${weekday}|${clusterKey}` 형식. 한 weekday 안 여러 cluster (시간 안 겹치는 time-row) 별 independent expand.

```typescript
const toggleRowExpand = (weekday: number, clusterKey: string) => {
  setExpandedRows((prev) => {
    const next = new Set(prev);
    const k = `${weekday}|${clusterKey}`;
    if (next.has(k)) next.delete(k);
    else next.add(k);
    return next;
  });
};
```

주 (week) 데이터 변경 시 reset (sessions prop dep).

## 3. Column 폭 — cluster 별 effectiveLanes 의 max

`TimeTableGrid.tsx weekdayWidths`:

```typescript
if (isDraggingAny) {
  lanes = required;  // drag 중에는 cluster 무시 (frozen 가드 별도)
} else {
  const clusters = computeRowClusters(daySessions);
  const laneNeeds = clusters.map((c) =>
    c.requiredLanes < 4 || expandedRows.has(`${wd}|${c.key}`)
      ? c.requiredLanes
      : 3,
  );
  lanes = Math.max(1, ...laneNeeds);
}
```

→ 한 cluster 만 expand 해도 column 폭이 그 cluster lane 수로 늘어남. 다른 collapsed cluster 는 lane 4+ 위치에 빈 공간 자연 발생 (사용자 의도).

## 4. Chip 렌더 — cluster 별

`TimeTableRow.tsx`:

```typescript
const clusterStates = useMemo(() => clusters.map(c => {
  const isExpanded = effectiveExpandedKeys.has(`${weekday}|${c.key}`);
  const isOverflow = !isDragging && c.requiredLanes >= 4;
  const visible = isOverflow && !isExpanded
    ? orderedInCluster.filter(s => (s.yPosition ?? 1) <= 3)
    : orderedInCluster;
  const hidden = isOverflow && !isExpanded
    ? orderedInCluster.filter(s => (s.yPosition ?? 1) >= 4)
    : [];
  const chipTopPx = isOverflow ? /* cluster startMin 기준 px */ : null;
  return { cluster: c, isExpanded, isOverflow, visible, hidden, chipTopPx };
}));
```

각 overflow cluster 에 chip 렌더 (배열):
- collapsed `+N` chip — 클릭 시 그 cluster popover open
- expanded `−` chip — 클릭 시 그 cluster collapse

Chip data-testid:
- 단일 cluster (legacy 시나리오, weekday 안 cluster 1 개): `overflow-expand-btn-${weekday}`
- multi-cluster (이번 변경): `overflow-expand-btn-${weekday}-${cluster.key}`

자동 분기 — 기존 test 호환 + 새 multi-cluster 시 cluster key 명시.

## 5. Popover — cluster key 기반 single open

`openPopoverClusterKey: string | null` (TimeTableRow 내부 state). 한 번에 하나의 cluster popover 만. drag 시작 시 close (`dragPreview.draggedSession` watcher).

```typescript
{openPopoverClusterKey != null && (() => {
  const st = clusterStates.find(s => s.cluster.key === openPopoverClusterKey);
  // ... render HiddenSessionsPopover with st.hidden + st.chipTopPx
})()}
```

## 6. drag 중 동작 — cluster 인지 무시

사용자 결정 (2026-05-15): drag 중에는 모든 cluster collapsed 로 treat (`effectiveLanes` freeze 가 cell mount/unmount flicker 가드 담당). cluster expand state 변경은 drop 후만 반영.

TimeTableGrid `weekdayWidths`:
- `isDraggingAny === true` → `lanes = required` (cluster 무시)
- `isDraggingAny === false` → cluster-aware

TimeTableRow `effectiveLanes`:
- `isDragging && frozenLanes != null` → `max(frozenLanes, rawMaxYPosition)`
- 그 외 → `max(...clusterStates.map(st => st.isExpanded ? st.cluster.requiredLanes : min(3, ...)))`

## 7. Backward compat — legacy `isExpanded` / `onToggleExpand`

TimeTableRow 가 legacy `isExpanded?: boolean` 과 `onToggleExpand?: () => void` 도 받음:
- `isExpanded` 값이 정의되면 모든 cluster 를 일괄 expand/collapse (= 기존 weekday 단위 토글)
- `onToggleExpand` 만 정의되면 chip 클릭 시 cluster key 무시하고 호출
- 둘 다 미정의 + 새 API 도 미정의 → internal state 로 uncontrolled fallback (legacy test 호환)

기존 test sandbox 시나리오 호환. 새 코드는 `expandedRowKeys` + `onToggleRowExpand` 사용.

## 8. 알려진 한계

- **drag 중 cluster 변화**: drag 중 sessions 가 lane shift / weekday 이동되면 cluster 재계산 발생할 수 있지만 사용자에게는 collapsed 로 보임. drop 후 cluster expand 상태 그대로 (expandedRows Set 의 cluster key 가 startMin 기반이라 sessions 변경에도 startMin 안 바뀌면 유지).
- **filter 활성 시 cluster 안 ordering**: matching first sort 가 cluster 별 적용. 그러나 cluster boundary 와 무관 — matching session 이 cluster 사이 이동 X.
- **mobile viewport**: 한 cluster 만 expand 해도 column 폭 ↑ → horizontal scroll. 기존 weekday-level 정책과 동일 한계.
- **chip top 위치 overlap**: 두 cluster 의 chipTopPx 가 가까이 있으면 chip 끼리 시각 충돌 가능 (예: 10:00 cluster + 10:30 cluster 가 시간 안 겹치는 케이스, e.g. 10:00-10:15 와 10:30-11:00). 일반 시나리오 (cluster 사이 충분히 떨어짐) 에서는 문제 X.

## 9. 테스트 회귀 가드

- `src/lib/__tests__/sessionClusters.test.ts` — 9 cases (빈 input, 시간 겹침, transitive, 부분 겹침, 연속 배치 등)
- `src/components/molecules/__tests__/TimeTableRow.test.tsx` § "Phase 4: inline overflow expansion" — 기존 + 3 multi-cluster 신규 (row 별 chip 2 개, row 1 만 expand, onToggleRowExpand 콜백 cluster key)

## 10. 변경 history

- **PR #(이번)** (2026-05-15): row-level overflow expand 전환.
  - `src/lib/sessionClusters.ts` 신규 — `computeRowClusters` sweep-line utility.
  - `TimeTableGrid.tsx`: `expandedWeekdays: Set<number>` → `expandedRows: Set<string>` (cluster key). `weekdayWidths` cluster-aware.
  - `TimeTableRow.tsx`: cluster 별 `visible/hidden/chipTopPx/isOverflow`. chip 배열 렌더 + popover cluster key 기반. legacy `isExpanded`/`onToggleExpand` backward compat.
  - tests: 9 cluster utility + 3 multi-cluster row test.
- 이전: weekday column 단위 expand (PR #240 등) — 사용자 보고 "첫 row 만 chip 표시" mismatch.
