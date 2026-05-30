# Hybrid Sync Phase 2/3 — Design Spec

**Date:** 2026-05-04
**Status:** Draft (구현 미착수)
**Related:** ARCHITECTURE.md § 1.2 Local-First, `src/lib/sync/timestamps.ts`, `src/hooks/useGlobalDataInitialization.ts`

---

## Context & Goals

class-planner의 동기화는 현재 **Phase 1 — passive timestamp sync**만 구현되어 있다. 페이지 로드 시 1회 server timestamp 비교로 localStorage를 덮어쓸지 결정하고, 그 후 변경은 fire-and-forget으로 서버에 비동기 push (`apiSync.ts`)된다. 페이지가 열려 있는 동안 다른 클라이언트가 데이터를 바꿔도 즉시 반영되지 않으며, 새로고침해야 갱신된다.

ADR-002(멀티테넌트)와 학부모 접속 코드 도입(`2026-05-02-parent-access-code-design.md`) 이후 동시 접속 환경의 수요가 증가:

- 원장 + 강사 + (향후) 직원이 동일 학원을 동시에 사용
- 한 사용자가 PC/태블릿 두 기기로 접속
- 학부모 코드 갱신/만료 시 같은 학원의 admin들이 즉시 알아야 함

**목표:** Phase 1을 보존한 상태에서 동기화 신선도를 단계적으로 끌어올리는 phasing 설계 — 지금 당장 구현하지 않고 운영 데이터 누적 후 ROI를 보고 착수.

---

## 현재 상태 (Phase 1, 2026-04 완료)

### 동작
- **초기 로드:** `useGlobalDataInitialization` → server fetch → `decideOverwrite` (`src/lib/sync/timestamps.ts`) → localStorage 덮어쓰기 여부 결정
- **로컬 쓰기:** localStorage 0ms 반영 + `apiSync.ts` 함수(`syncStudentCreate`, `syncSessionUpdate` 등)가 fire-and-forget으로 서버 push
- **충돌 정책:** server timestamp 우선. 로컬이 더 신선하면 SKIP하여 미동기 로컬 쓰기 보존

### 한계
1. 다른 클라이언트의 변경을 알 길이 없음 — 새로고침에만 의존
2. fire-and-forget 실패 시 user-visible 신호 없음 (콘솔 로그만)
3. 멀티 탭/멀티 기기에서 동일 사용자가 같은 데이터를 편집하면 마지막 쓰기가 이전 쓰기를 덮어씀

---

## Phase 2 — 백그라운드 폴링 (Background Polling)

### 트리거 조건 (모두 만족)
- 사용자 인증 완료 (anonymous 사용자는 폴링 없음 — 서버 데이터 없음)
- 페이지 visibility = `visible` (백그라운드 탭은 폴링 정지)
- 마지막 sync 이후 N초 경과
- 네트워크 reachable (브라우저 `navigator.onLine`)

### 권장 주기
- **활성 탭:** 30초 (학원 운영 중 다른 사용자 변경 감지에 충분)
- **백그라운드 탭:** 폴링 정지 → 탭 활성화 시(`visibilitychange`) 즉시 1회 동기화 후 정상 주기 재개
- **저활동 탭** (10분 이상 사용자 입력 없음): 60초로 감속

### 구현 위치
- 신규 hook: `src/hooks/useBackgroundSync.ts`
- 진입점: `useGlobalDataInitialization` 후에 마운트되며, 같은 fetch 함수 재사용
- 충돌 정책: Phase 1과 동일 (`decideOverwrite`)

### Conflict 처리
폴링은 Phase 1 헬퍼를 그대로 재사용:

```text
poll → server fetch → decideOverwrite(local, server)
  → "skip" (local-newer): localStorage 보존, 폴링 결과는 무시
  → "overwrite": localStorage 갱신 + React state 재계산
```

폴링 결과로 인한 overwrite가 발생하면 **사용자에게 작은 indicator** ("최신 데이터로 갱신됨" 토스트 또는 헤더 점) — 사용자 피드백을 통해 동기화 동작을 가시화.

### 비용 영향
- Supabase: 활성 사용자 1명 = 30초당 1회 RPC. 학원당 admin 2명 + 강사 5명 가정 시 7 req/30s = ~840 req/h.
  - Free tier (50만 req/월) 한도 내 충분히 운영 가능 (학원 1곳, 7 active = ~600k req/월).
  - 학원 4곳 이상 / active 사용자 합계 20명 이상이면 Phase 3로 진입 검토.
- Lightsail 1GB: 동일 RPC를 Supabase가 직접 처리하므로 Lightsail 부하 추가 없음.

### 측정 지표
- `lag_after_other_user_change_sec` (다른 사용자 변경 후 본 화면 갱신까지 시간)
- `polling_failure_rate` (네트워크 / 401 / 5xx)
- `polling_skip_ratio` (overwrite vs skip — local-first가 작동하는지)

### 측정 도구
- omni-radar `event_type: client_fetch` + custom span `target: poll-sync`
- 일주일 운영 후 위 지표로 Phase 3 진입 ROI 판단

---

## Phase 3 — Supabase Realtime

### 동기
폴링 30초 lag도 동시 편집 시나리오에는 답답:
- 원장이 수업 추가 → 강사가 즉시 보지 못함 → 강사가 같은 자리에 다른 수업 입력 → 충돌
- 학부모 코드 갱신 직후 다른 admin 화면에는 구 코드가 30초간 살아있음

### 구독 대상 테이블
| 테이블 | 이벤트 | Row filter |
|---|---|---|
| `students` | INSERT/UPDATE/DELETE | `academy_id = current` |
| `subjects` | INSERT/UPDATE/DELETE | `academy_id = current` |
| `sessions` | INSERT/UPDATE/DELETE | `academy_id = current` |
| `enrollments` | INSERT/UPDATE/DELETE | `academy_id = current` (via session join) |
| `teachers` | INSERT/UPDATE/DELETE | `academy_id = current` |
| `share_tokens` (access codes) | INSERT/UPDATE/DELETE | `academy_id = current` |
| `attendance` | INSERT/UPDATE | `academy_id = current` (선택, 부하 따라) |

### 토픽 정합
- 토픽: `academy:{academy_id}` 단일 채널 (테이블별 채널 분리 시 connection 폭증)
- RLS와 정합: 클라이언트가 자기 academy_id가 아닌 row를 받지 않도록 publication filter + RLS 양쪽 가드

### Multi-Tab Dedup
한 사용자가 같은 academy를 두 탭에서 열면 동일 구독을 두 번 만들면 비효율 + 비용 2배:

- **BroadcastChannel** (`new BroadcastChannel('class-planner-sync')`)로 leader 선출
- leader 탭만 Realtime 구독을 유지, 나머지 탭은 leader가 broadcast하는 update를 받아 localStorage만 갱신
- leader 탭 닫힘 시 follower 중 하나가 leader로 승격
- BroadcastChannel 미지원 환경(구형 사파리 등) → 모든 탭이 직접 구독 (fallback)

### 연결 끊김 처리
Realtime이 연결 단절되면 (네트워크 또는 Supabase 일시 장애):

1. 끊김 감지 → 폴링(Phase 2) 즉시 활성화 (Phase 2를 영구 fallback으로 유지)
2. 재연결 시 → 마지막 sync timestamp로 갭 보정 (`decideOverwrite`로 한 번 더 검증)
3. 사용자에게는 끊김 사실 비노출 (성공적으로 보정되면 silent), 1분 이상 지연 시 작은 경고 표시

### 비용
- Supabase Realtime: free tier connection cap 200. 학원 4곳 × admin 2 × 멀티탭 dedup = 8 conn → 여유.
- 데이터 전송: row 변경마다 ~1KB. 학원당 일평균 100 변경 가정 시 100KB/일 — 무시 가능.

### Phase 2와의 관계
Phase 3가 도입되더라도 **Phase 2(폴링)는 fallback으로 유지**:
- 연결 끊김 시 자동 활성화
- BroadcastChannel 미지원 환경에서 leader 탭 외 보조 sync
- Realtime 메시지 손실 감지 시 (sequence number gap) 1회 재동기화

Phase 2를 완전히 끄지 않는 것은 단순 룰: "Realtime은 fast path, 폴링은 safety net."

---

## Devil's Advocate

### Weaknesses

1. **Phase 2 폴링 부하** — 학원 4곳 × 7명 active = 28 req/30s. 동시 학원 수가 더 늘면 Lightsail 1GB가 다른 워크로드와 경쟁. 임계값 30 active concurrent에 도달하면 Phase 3로 강제 진입.
2. **Realtime connection cap** — Supabase free tier는 200. multi-tab dedup이 깨지면 (BroadcastChannel 실패) 한 사용자가 5탭 = 5 conn. 30 active × 5 = 150 → 위험.
3. **BroadcastChannel 미지원** — iOS Safari 15 이하, 구형 KaTalk WebView. fallback 경로가 모든 탭 동시 구독이라 cap 압박.
4. **localStorage write 폭증** — Realtime push 빈도가 높을 때 localStorage write가 자주 일어나면 Safari에서 `QuotaExceededError` 가능성. 일정 batching 필요.
5. **사용자 작업 중 silent overwrite** — 폴링/Realtime이 사용자가 편집 중인 form을 덮어쓸 가능성. dirty form indicator + "변경 사항이 있어요. 갱신하시겠습니까?" prompt 필요.

### Rejected Alternatives

| 대안 | 기각 이유 |
|---|---|
| **Realtime만 (폴링 없이)** | 연결 끊김 / 메시지 손실 감지 후 재동기화 경로 필요. Phase 2 안전망이 없으면 silent staleness. |
| **자체 SSE 서버 (Lightsail)** | 1GB 인스턴스에서 idle 연결을 다수 유지하는 비용이 Realtime API call보다 비효율. ADR-001의 "Self-hosted 안 함" 결정과 충돌. |
| **WebSocket 자체 구현** | 인증/RLS 재구현 부담 + 운영 복잡도 증가. Supabase Realtime이 RLS와 자동 정합. |
| **5초 폴링** | 30초 → 5초로 줄이면 비용 6배. 동시 편집 lag 5초도 여전히 인지 가능. ROI 낮음. Realtime이 정답. |

### Uncertainties

- Phase 2 → Phase 3 전환 시점 판단 기준이 운영 데이터 부재로 추정. 학원 4곳 도달 또는 동시 편집 충돌 주 1회 이상 관측이 권장 임계값이지만 검증 필요.
- BroadcastChannel 미지원 비율이 학원 운영자 환경에서 어느 정도인지 모름 (현재 사용자 5명 표본 부족).
- Realtime의 RLS row filter가 academy_id 변경 시(매우 드문 multi-tenant 이전) 정상 작동하는지 검증 미실시.

---

## Decision Support Format

### Observation
- 현재 사용자 5명, 학원 1곳. 동시 편집 시나리오는 관측 부재 (memory: project_class_planner_phase2a, project_teacher_feature_phase1_6).
- Phase 1 timestamp sync로 데이터 정합성은 확보됨 — silent staleness만 남은 상태.
- 학부모 접속 코드 도입(2026-05-02)으로 admin 간 코드 갱신 동시성 노출이 발생할 수 있는 첫 기능.

### Interpretation
지금 당장 Phase 2/3을 구현하면 사용자 5명 환경에서 ROI가 낮다. 운영 데이터(다른 클라이언트 변경 후 lag 분포, 동시 편집 빈도) 누적 → 임계값(학원 4곳 또는 active concurrent 8명) 도달 시 Phase 2 착수.

### Alternative Interpretation
학부모 코드 갱신처럼 critical 동시성 시점이 이미 도입됐으므로 Phase 3 직진(Phase 2 우회)도 합리적. 30초 폴링으로 학부모 안내 사고가 발생하면 신뢰 손상이 커서.

### Recommendation
**기본 경로:** Phase 1을 유지하면서 운영 지표를 omni-radar로 수집 → 임계값 도달 시 Phase 2 → 일주일 운영 후 Phase 3.

**예외 경로:** 학부모 코드 운영 중 동시성 사고가 1건이라도 발생하면 Phase 2를 건너뛰고 Phase 3 직진. 사고 이후 Phase 2 fallback도 함께 구현.

판단은 HYUNJIN.

---

## Out of Scope

- 본 spec은 phasing 설계만 정의. 실제 ADR(아키텍처 결정 기록)은 Phase 2 또는 3 착수 시점에 별도로 발행 (현재 ADR 005까지 사용).
- 충돌 해결 UX 상세(merge UI, dirty form 보존 모달 등)는 phase별 implementation plan에서 별도 다룸.
- mobile network(셀룰러) 관련 polling 비용 절감 정책은 추후 결정.

---

## Verification (구현 시)

Phase 2 착수 시:
- `useBackgroundSync` 단위 테스트 — visibility 변화, 인증 상태, 주기 감속
- 통합 테스트 — 두 탭 시나리오에서 한쪽 변경 후 30초 내 다른쪽 갱신 확인
- omni-radar lag 지표가 30s 이하

Phase 3 착수 시:
- BroadcastChannel leader 선출 단위 테스트
- 연결 끊김 → 폴링 fallback → 재연결 통합 테스트
- multi-tab dedup 검증 (3탭에서 connection이 1개만 유지)
- omni-radar lag 지표가 1s 이하
