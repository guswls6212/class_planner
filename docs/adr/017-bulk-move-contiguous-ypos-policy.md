# ADR 017 — 멀티선택 이동/복사 시 contiguous yPosition 분배 (Option D 폐기)

- **Status**: Accepted (v1: 2026-05-15, v2: 2026-05-16 — group-shift 채택)
- **Supersedes**: PR #208 (`beb54b3`, "Option D" — 추종 yPosition=1 강제)
- **Related**: PR #390 (DnD 시각 피드백 SSOT 통일), PR #391 (v1), PR #(이번) (v2)

## v2 amendment (2026-05-16)

v1 의 per-session contiguous 정책이 anchor 가 group **가운데/끝** + drop 위치가 작은 경우 follower 음수 clamp → 모두 lane 1 으로 모이고 sequential reposition 의 chain push 가 random order 로 풀어 visual order 깨짐 (사용자 보고 Image #14 — 5 sessions anchor=lane 3 drop lane 1 → 결과 `2,3,4,5,1` random).

v2 정책 (**group-shift contiguous**):
```typescript
const groupStartLane = Math.max(1, newYPosition - anchorRelIdx);
const yPos = groupStartLane + i;  // 모든 candidate (anchor 포함)
```

- 정상 case (anchor 가 group 왼쪽 끝 또는 drop 위치 충분히 큼): `groupStartLane = newYPosition - anchorRelIdx` → anchor.yPos === newYPosition. v1 과 동일 행동.
- 음수 clamp case (anchor 안쪽 + drop 작음): `groupStartLane = 1` → group 전체가 lane 1 부터 contiguous. anchor 가 drop lane 과 다른 lane (= 1 + anchorRelIdx). 사용자 mental model 일부 변경 — drop lane 은 group의 시작점, anchor 는 group 안 상대 위치 유지.

trade-off: anchor 가 drop lane 에 정확히 가지 않는 case 가 생기지만 visual order 항상 보존. 사용자 검증 (2026-05-16) 으로 후자 우선 확정.

## Context

class-planner 시간표 (`/schedule`) 에서 사용자가 N (≥2) 개의 수업을 멀티선택 (Shift+클릭) 후 한 수업을 드래그하면 anchor + 추종 sessions 모두 같은 delta (요일/시간) 로 이동/복사된다. anchor 의 새 yPosition 은 drop 위치 (`newYPosition`) 로 정확히 결정되지만, **추종 sessions 의 yPosition 결정 정책** 은 시간이 지나며 변천했다.

### History of policy

1. **Pre-Option D** (~PR #200 이전): 추종 sessions 은 원래 `yPosition` 그대로 보존. 충돌 발생 시 `repositionSessionsUtil` 의 chain push 로 해소.
   - 문제: 그룹 전체가 빈 lane 으로 흩어져 보임. "같이 따라왔다" 시각 단서 부재.

2. **Option D** (PR #208, 2026-05-04): 추종 sessions 모두 `yPosition=1` 강제. anchor 는 `newYPosition` 보존.
   - 의도: 추종이 lane 1 (가장 왼쪽) 에 모여서 사용자가 "같이 따라왔음" 을 한 눈에 인지.
   - 회귀 (2026-05-15, 사용자 보고 Image 8/9): 5 개 같은 시간 sessions group 멀티선택 후 가장 오른쪽 (lane 5) 의 anchor 를 드래그하면 결과 lane 순서가 **학생 ID asc (2,3,4,5,1)** 로 깨짐. 사용자 의도 = visual order **(5,4,3,2,1)** 보존.
   - RC: `computeBulkMoveTargets` 가 candidates 를 `sessions.filter(...)` 순서 (= sessions array 순서 = 학생 ID asc) 로 순회하고 모두 `yPosition=1` 강제 → sequential `repositionSessionsUtil` 호출 순서에 따라 lane 분배가 학생 ID asc 로 결정. visual order 와 무관.

## Decision

**Contiguous yPosition 분배 정책 채택**.

`computeBulkMoveTargets` 의 추종 yPosition 분배 규칙:

```typescript
// 1. candidates 를 원래 yPosition asc 로 정렬
const sortedCandidates = candidates.sort((a, b) =>
  (a.yPosition ?? 1) - (b.yPosition ?? 1)
);
// 2. anchor 의 sortedCandidates 내 상대 인덱스
const anchorRelIdx = sortedCandidates.findIndex(s => s.id === anchorSessionId);
// 3. 각 candidate i 의 새 yPosition:
//   - anchor (i === anchorRelIdx): newYPosition (drop 위치 정확히 보존)
//   - follower:                    Math.max(1, newYPosition + (i - anchorRelIdx))
//                                  (clamp >=1; 위쪽 clamp 는 reposition 책임)
```

### Sequential reposition 호출 순서 결정성

`page.tsx` 의 `handleSessionDrop` / `handleSessionCopy` 가 호출 순서를 **anchor first + 추종 yPosition asc** 로 정렬한 뒤 sequential `repositionSessionsUtil` 호출:

```typescript
const orderedMoves: BulkMoveTarget[] = [
  moves.find(m => m.session.id === sessionId),  // anchor first
  ...moves
    .filter(m => m.session.id !== sessionId)
    .sort((a, b) => a.yPosition - b.yPosition),
].filter((m): m is BulkMoveTarget => Boolean(m));
```

→ anchor 가 자기 lane 점유 후 추종이 contiguous yPos 로 chain push. collision algorithm 이 deterministic 한 상태에서 visual order 보존.

## Consequences

### 긍정적
- 사용자 의도 충족: 어느 수업을 anchor 로 잡든 group 의 visual order (yPosition asc) 보존.
- 결정성: candidate 순회 + reposition 호출 순서가 명시적으로 yPosition asc → 같은 입력 → 같은 결과.
- `repositionSessionsUtil` 의 chain push 가 sparse 충돌 시에도 안정 작동 (anchor priority=1, 추종은 yPos asc 로 들어옴).

### 부정적 / Trade-off
- Option D 의 "같이 따라왔다" 시각 단서 (lane 1 cluster) 가 사라짐. 사용자가 멀티선택 표시 (chip count 또는 outline) 로만 인지.
- Edge case: anchor 가 group 오른쪽 끝 + drop lane 1 → follower 의 raw yPos 가 음수 → `Math.max(1, ...)` clamp 으로 모두 lane 1 강제 (Option D 와 동일 결과). 사용자 mental model 검증 필요.
- Cross-row mix (멀티선택에 다른 startsAt sessions 포함) 시 contiguous 분배 의미 모호 — 현재는 yPosition asc 단일 기준 적용. 향후 cluster-aware (별도 ADR) 검토.

## Alternatives considered

- **A. yPosition delta 일관 적용** (`s.yPosition + (newYPosition - anchor.yPosition)`): 같은 row 에서는 contiguous 와 동치. cross-row 에서 anchor delta 일관 — 의미 명확. **단점**: anchor 가 group 양 끝에 있을 때 음수/큰 yPos clamp 필요. contiguous 와 비교해 robust 함 측면에서 거의 동등.
- **B. Multi-aware reposition**: `repositionSessionsUtil` 을 multi-session batch 처리로 확장. complexity 높음 — 별도 PR.
- **C. Option D 유지 + sequential reposition 호출 순서 결정성만 부여**: visual order 보장 부족 (collision algorithm 의존). 사용자 보고 케이스 미해결.

## Implementation

- `src/app/schedule/_utils/computeBulkMoveTargets.ts`: contiguous yPos 분배.
- `src/app/schedule/page.tsx`: `handleSessionDrop` / `handleSessionCopy` 에서 anchor-first orderedMoves 정렬.
- `src/app/schedule/_utils/__tests__/computeBulkMoveTargets.test.ts`: Option D unit test 삭제 + contiguous 4 신규 케이스 (anchor 왼쪽/오른쪽 끝/가운데 + clamp).
- `tests/e2e/schedule-multi-select-drag.spec.ts` T11c: 정책 invert (시각 순서 보존 회귀 가드).

## Future work

- Cross-row 시나리오 정책 명확화: 멀티선택에 다른 startsAt sessions 가 섞인 경우 contiguous 분배는 anchor 의 row 기준이라 다른 row 추종의 yPos 가 어색할 수 있음. Issue 2 의 `computeRowClusters` 와 결합해 cluster 단위 contiguous 분배 검토.
- Visual feedback 강화: 추종 sessions 가 "그룹" 임을 dragOverlay 또는 in-grid 표시로 보완.
