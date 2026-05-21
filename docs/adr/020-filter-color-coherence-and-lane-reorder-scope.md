# ADR-020: 필터-색 일치 + Lane Reorder 범위 정정

**Status:** Accepted
**Date:** 2026-05-21
**Deciders:** HYUNJIN

## Context

ADR-003 (2026-04-29) 의 색·필터·dim/glow 정책 + PR #284 (2026-05-08, UI_SPEC L162-172) 의 매칭 세션 lane reorder 도입 이후 UAT 2026-05-21 에서 두 가지 인지 부조화 발견.

### 부조화 1 — 본체 색이 "선택된 학생" 색이 아님

사용자가 "홍길동" chip 선택했는데:
- 토 영어 session (attendees: `[박지수, 정수아, 김지우, 홍길동]`) → **박지수 색 (파랑)**
- 다른 session (attendees: `[홍길동, ...]`) → 홍길동 색

원인: `src/components/molecules/SessionBlock.utils.ts:258-259`

```ts
if (colorBy === "student") {
  const studentId = firstEnrollment?.studentId;  // ← 선택된 학생이 아닌 "첫 enrollment"
  if (studentId) return getStudentDeterministicColor(studentId);
}
```

세션의 **첫 enrollment 학생** 색을 본체에 사용. 사용자가 chip selected한 학생 무관.
ADR-003 Decision 1 ("학생 칩 미선택 → 과목 색 폴백") 정신은 "학생을 골라야 학생 시간표" 이지만, 칩 선택 시 본체 색 spec 은 ADR-003 어디에도 명시 안 됨 — implicit decision.

### 부조화 2 — 겹침 없는 session도 lane이 바뀜

사용자가 "홍길동" chip 선택 → 월 14:00-15:30 코딩 (시간 겹침 없음) 이 lane 1 → lane 2 로 이동.

원인: `src/components/molecules/TimeTableRow.tsx:406-420`

```ts
const orderedSessions = useMemo(() => {
  if (!isFilterActive) return [...weekdaySessions].sort(sortByYPos);
  const matching = ...sort(sortByYPos);
  const nonMatching = ...sort(sortByYPos);
  return [...matching, ...nonMatching];
}, [...]);
```

**weekdaySessions 전체**에 대해 matching first, nonMatching last 로 정렬. 시간 겹침 없는 session 까지 정렬 순서 변경 → 같은 weekday 의 `laneWidth` / `effectiveLanes` 계산에 영향 → 겹침 없는 session 의 left 좌표가 변경되어 lane 이동처럼 보임.

사용자 의도 (정정): lane reorder 는 **4+ 겹침 → `+N` 오버플로우 발생** 케이스에서 매칭 session 이 hidden 되지 않도록 visible 앞 lane 으로 끌어오는 것. **겹침 없으면 yPosition 고정**.

## Decisions

### D1. 필터-색 일치 — R5 "고정 과목 색 + dim contrast"

**본체 색 spec:**
- `colorBy="subject"` (default): session 본체 = **과목 색** (firstEnrollment.subjectId → subject.color)
- `colorBy="teacher"`: session 본체 = 강사 색 (session.teacher_id → teacher.color)
- `colorBy="student"` 모드 selector **제거**. localStorage `ui:colorBy` 의 "student" 값은 다음 진입 시 "subject" 로 자동 마이그레이션 (1회).
  - 학생 **필터링은 유지** — chip 선택 + dim contrast 로 시각화. 본체 색 변경 spec 만 제거.

**필터 매칭 시각화 — Dim Contrast Only:**
- 매칭 session → **기존 본체 색 (과목 색) 그대로 유지** + opacity 1.0
- 비매칭 session → opacity 0.25 dim (ADR-003 Decision 2 정신 유지)
- **Ring 표시 제거** — ADR-003 Decision 2 의 "학생색 outer glow ring" + 추후 검토된 multi-ring 모두 **폐기**
- 다중 type 필터 ([학생+과목+강사]) 도 동일 — AND 결합으로 매칭/비매칭 결정 후 dim 대비 만 적용

**근거:**
- 학생/과목/강사 마다 색이 다르므로 ring 추가하면 매번 시각 변동 — 사용자 인지 부담
- 매칭/비매칭 dim 대비만으로 "필터됐다" 신호 충분 — 추가 색 정보 불필요
- 본체 색은 가장 안정적인 entity (과목) 기준으로 고정 → 학생/강사 chip 변경에 흔들리지 않음 (PDF 인쇄도 안정)
- UI 일관성 — 어떤 filter 조합이든 본체 색 결정 로직 동일 (과목 색)

### D2. Lane Reorder 범위 정정

**현재 spec (취소):** weekdaySessions 전체에 matching first, nonMatching last 정렬 (TimeTableRow.tsx:406-420).

**새 spec:** reorder 는 **cluster (시간 겹침 그룹) 내부에서만** 작동.
- cluster 안 4+ 겹침 → 매칭 session 우선 visible, 비매칭 은 `+N` 오버플로우 chip 으로 hidden
- cluster 안 매칭/비매칭 혼합 visible 정원(3) 이내 → 모두 visible, yPosition 정렬
- 겹침 없는 session (cluster size 1) → yPosition 고정. 필터 영향 X.
- cluster 간 정렬은 시간 기준만. 매칭/비매칭 영향 X.

**구체:**
- 같은 weekday 의 `effectiveLanes` / `laneWidth` 계산은 yPosition 기반으로 유지 (필터 영향 X)
- `orderedSessions` 의 weekday-wide matching-first 정렬 제거
- `clusterStates.visible/hidden` 결정 시점에 cluster 단위로 매칭 우선 선택 적용

### D3. ADR-003 관계

- ADR-003 Decision 1 ("학생 칩 미선택 → 과목 색 폴백") 정신을 칩 **선택 시까지** 확장 — 본체 색은 항상 과목 색 (D1)
- ADR-003 Decision 2 ("학생색 outer glow ring") 의 **ring 부분 폐기**. opacity 0.25 dim 정책은 유지 (D1)
- ADR-003 Decision 4 ("+N 인라인 칩") 유지. cluster 단위 visibility 정책 명확화 (D2)
- ADR-003 의 implicit "본체 first-enrollment 학생 색" decision 폐기 (D1)

## Multi-Perspective Analysis

### Maintainer
- `resolveSessionColor` 분기 단순화 — colorBy="student" 의 deterministic 학생 색 분기 제거. 거의 모든 케이스가 subject fallback.
- `pickRingHex` 호출 제거 + SessionBlock 의 boxShadow ring 렌더링 코드 삭제. **순 코드 감소**.
- `TimeTableRow.orderedSessions` 의 matching-first 로직 제거 + cluster 단위 visible 결정으로 이전. clusterStates 가 이미 별도 분리되어 있어 변경 표면적 작음.

### 학원 운영자
- "홍길동 필터 → 매칭 session 만 또렷, 나머지는 흐릿" 단순 멘탈 모델
- 어떤 filter 조합이든 시각 패턴 동일 — 학습 곡선 0
- session 본체 색이 과목 기준이라 시각 트래킹 안정

### 인쇄 품질
- 본체 색이 과목으로 고정 → PDF 인쇄 시 색상 안정 (학생/강사 chip 상태 무관 일관)
- Ring 제거로 PDF 출력 spec 단순화 (인쇄 시 dim/ring 비활성 분기 불필요)

## Devil's Advocate

### Weaknesses

1. **colorBy="student" 모드 selector 의 의미 약화** — 본체 색이 모두 과목 색이면 학생 모드 selector 무의미.
   - 완화: 학생 모드 selector 제거. 학생 필터링 자체는 유지 (chip 선택 + dim contrast).

2. **매칭 신호가 dim 대비뿐** — 색 강도가 약한 환경 (눈부심, 모니터 calibration 낮음)에서 매칭 인지가 어려울 수 있음.
   - 완화: opacity 0.25 는 충분히 강한 대비. 추후 사용자 보고 발생 시 dim 정도 조정 또는 outline 추가 검토 (별도 변경).

3. **PR #284 의 weekday-wide reorder 사용자 시나리오 회귀 risk** — 같은 weekday 의 떨어진 시간대 두 session 이 모두 매칭일 때 이전엔 matching first 정렬로 시각 강조됐는데, 이제 yPosition 만 따름.
   - 완화: 사용자가 본 시나리오는 "겹침 있을 때만 reorder" 의도라고 명시. UAT 회귀 발생 시 재검토.

### Rejected Alternatives

- **R1 (Anchor 우선순위, student > teacher > subject):** 다중 type 시 어느 type 우선해야 하는지 영구적 trade-off
- **R2 (명시 선택 entity 색):** session 에 multiple matching entity 있을 때 (예: 한 session 에 홍길동 + 김지우 둘 다 chip selected) 모호
- **R3 (고정 과목 색 + 다중 ring):** 본체 색은 안정적이나 ring 으로 각 entity 색 매번 표시 → UI 시각 변동 + 사용자 인지 부담 (사용자 2026-05-21 결정)
- **R4 (시드 데이터만 fix — attendees 첫번째 정리):** 다른 학생 필터 시 같은 함정 재발. 근본 해결 아님

### Uncertainties

- Cluster 단위 visible/hidden 결정 시 매칭 우선 정렬 정확한 알고리즘 (yPosition tiebreaker 등) — 구현 시점 결정

## Consequences

**Positive:**
- 필터-색 인지 부조화 해소 (사용자 멘탈 모델 일치)
- Lane reorder 가 의도된 시나리오 (오버플로우) 에만 작동 → 안정적 시각
- ADR-003 implicit decision 명문화 → SSOT 강화
- 어떤 filter 조합이든 시각 패턴 동일 → 학습 곡선 0, UI 일관성 극대화
- Ring 렌더링 / `pickRingHex` 코드 제거 → 순 코드 감소

**Negative / Trade-offs:**
- colorBy="student" 모드 selector 제거 — localStorage 마이그레이션 1회 필요
- 회귀 test 갱신: `SessionBlock.utils.test.ts`, `TimeTableRow.test.tsx`, `ui-integration.test.tsx`
- 매칭 신호가 dim 대비뿐 — 추후 모니터 환경별 가독성 사용자 보고 모니터링

## References

- ADR-003: 시간표 색·필터·타임라인·오버플로우 통합 (2026-04-29) — 본 ADR 의 모체
- PR #284: ColorBy 모드 dim/glow 통일 + lane reorder (2026-05-08)
- UI_SPEC.md L162-172 — 본 ADR 채택 시 spec 갱신 의무
- UAT 2026-05-21: 본 부조화 보고 + R3 채택
