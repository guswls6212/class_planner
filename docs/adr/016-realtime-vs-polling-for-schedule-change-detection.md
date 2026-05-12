# ADR-016: Realtime vs Polling for Schedule Change Detection

**Date**: 2026-05-13
**Status**: Accepted (현 시점 polling 유지)
**Context owner**: HYUNJIN

## 배경

class-planner는 멀티 admin 환경에서 한 admin이 sessions를 변경했을 때 다른 admin에게 `ScheduleChangeBanner`로 알려준다. 현재 구현은 `useScheduleMeta`의 **30초 polling**:

```ts
// src/hooks/useScheduleMeta.ts
const POLL_INTERVAL_MS = 30_000;
pollerRef.current = setInterval(tick, POLL_INTERVAL_MS);
```

호출 endpoint: `GET /api/academies/active/schedule-meta?userId=...` → `academies.schedule_updated_at` 반환. client는 lastViewedAt 비교 후 banner 토글.

### 현재 polling의 안전 가드 (PR #350, #370 등에서 누적)

- **Visibility gate**: tab background 시 polling 정지 (`useScheduleMeta.ts:186`)
- **Self-sync window (10s)**: 본인 sync 후 server timestamp가 같은 윈도우 내면 자동 ack — banner 안 띄움
- **Stale threshold (24h)**: 24시간 이상 묵힌 변경은 자동 ack — page reload 후 "어제 변경 알림" 사고 방지
- **EventTarget + localStorage 이중 구독**: 같은 탭 + 다른 탭 + page reload 모두 cover

→ 현재 polling은 정밀하게 정리됨. UX false-positive 거의 없음.

## 측정 결과 (2026-05-12 omni-radar)

`/schedule` 페이지 한 admin × 1시간 idle:
- `schedule-meta` 호출 = 120회/시간 (30초 × 2 burst dev only, prod 1회 가정 시)
- 가설: 학원 100개 × admin 평균 2명 × 30초 polling = **288,000 호출/일**

DB 영향: Supabase는 query plan이 작아서 부담은 미미하지만, 사용량 무료 한도가 있어 학원 50개 + admin 200명+ 시점에서 paid tier 압박.

## 고려한 옵션

### Option A — Polling 유지 (현재)
- **장점**: 구현 0, 인프라 변경 0, 비용 0
- **단점**: 30초 latency, idle 시도 호출 발생, 학원 scale 시 호출 수 선형 증가

### Option B — Supabase Realtime (Postgres Changes)
Supabase가 기본 제공하는 WebSocket-based pub/sub. sessions 테이블 row 변경 시 자동 push.

```ts
supabase
  .channel(`sessions:${academyId}`)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'sessions', filter: `academy_id=eq.${academyId}` },
    () => setHasChanges(true),
  )
  .subscribe();
```

- **장점**:
  - 반응 latency ~100ms
  - Idle 시 push 0 (connection만 유지)
  - 이미 Supabase 사용 중이라 추가 인프라 0
  - Free tier: 동시 200 connection / 월 2M 메시지 — 학원 50개 + admin 200명까지 무료
  - RLS 정책으로 academy 단위 격리 자동
- **단점**:
  - Nginx WebSocket proxy config 1줄 추가 필요 (Lightsail)
  - 모바일 background 시 connection 끊김 — visibility change 시 reconnect 로직 필요
  - RLS 정책 잘못 짜면 다른 academy 변경 수신 (보안 이슈)
  - 디버깅이 polling보다 복잡 (timing, reconnect 시나리오)
  - **현재 polling의 안전 가드들(self-sync, stale, visibility)을 Realtime 모델로 재구현 필요**

### Option C — Server-Sent Events (SSE) on Lightsail
Next.js API route가 long-lived HTTP stream으로 push.

- **장점**: HTTP 기반(proxy 친화적), Supabase 의존 줄임
- **단점**:
  - Next.js serverless 패러다임과 안 맞음 (long-lived connection)
  - DB → server push가 필요 → 결국 Supabase Realtime을 server에서 받아 SSE로 relay하는 패턴 (즉 Supabase Realtime 의존 그대로)
  - Lightsail 1GB로 동시 100+ connection 어려움 → scale 시 upgrade 필요 ($5 → $10 → $20)
  - 구현 복잡도 가장 높음

## 비교 표

| 항목 | Polling (현재) | Supabase Realtime | SSE on Lightsail |
|---|---|---|---|
| 반응 latency | 30초 | ~100ms | ~1초 |
| Idle 호출 수 | 120/시간/admin | 0 | 0 |
| 인프라 변경 | 없음 | Nginx WS proxy | Stream API route |
| 구현 복잡도 | 0 (이미 됨) | 낮음 | 높음 |
| Lightsail 1GB 영향 | 미미 | 미미 | 위험 (100+ conn) |
| Supabase Free tier | OK | OK (200 conn) | N/A |
| Scale 시 추가 비용 | 0 | $25/월 (Pro) | $10-20/월 (Lightsail upgrade) |

## 결정

**현 시점에서 Polling 유지. 다음 trigger 조건 충족 시 Supabase Realtime 마이그레이션 검토.**

### Trigger 조건 (any of)

1. 같은 학원에서 admin **5명 이상 동시 운영** (현재 1-2명)
2. **학원 30개 이상** 시스템 운영 (현재 5개)
3. Supabase Free tier `schedule_updated_at` query 부담 가시화 (e.g. 일일 50,000+ 호출)
4. 사용자 피드백: "변경 알림이 너무 늦음" (현재 30초 acceptable)

### 의도된 trade-off

- **30초 latency 수용**: 학원 운영자가 시간표를 동시 편집하는 빈도가 낮음. 30초 후 보는 것과 즉시 보는 것의 UX 차이가 크지 않음.
- **idle traffic 수용**: 학원 50개 미만이면 호출 부담 무시 가능.
- **단일 admin은 영향 없음**: self-sync window가 본인 변경을 zero-latency로 처리.

## Consequences

### 단기 (현재 ~ scale trigger 전)
- 구현 변경 0
- Lightsail/Supabase 비용 그대로 ($5/월)
- 30초 latency acceptable

### Realtime 도입 시 필요한 작업 (future)

trigger 충족 시 다음 순서로 진행:

1. **Supabase Realtime 활성화**: dashboard에서 `sessions` table에 Realtime enable
2. **RLS 정책**: `academy_id` 기반 SELECT 정책 (이미 있을 수 있음 — 검증 필요)
3. **Nginx WebSocket proxy**: Lightsail nginx config에 `proxy_set_header Upgrade $http_upgrade;` 추가
4. **`useScheduleMeta` 마이그레이션**:
   - polling 제거, `supabase.channel().on('postgres_changes', ...)` 구독
   - **현재 안전 가드 보존**:
     - self-sync window 10s — 본인 변경 push 받았을 때 자동 ack
     - stale threshold 24h — page reload 시 lastViewedAt 비교 로직 그대로
     - visibility — `document.visibilitychange` 시 channel pause/resume
5. **Reconnect 로직**: WebSocket 끊겨도 자동 재연결 + reconnect 직후 한 번 polling으로 missed 변경 보충
6. **모니터링**: Supabase Realtime connection 수 + 메시지 수 dashboard 확인. Pro tier 임계 ($25/월 = 500 connection / 5M 메시지) 도달 전 알림

### Rejected: SSE on Lightsail

- SSE를 도입해도 DB → server push가 필요 → 결국 Supabase Realtime 의존
- Lightsail scale 시 upgrade 비용 발생
- 구현 복잡도 vs 이점 trade-off가 Supabase Realtime보다 나쁨
- 인프라 다양화 명분이 약함 (이미 Supabase Auth + DB 깊이 사용 중)

## 검증

- 본 ADR 작성 시점(2026-05-13)에 schedule-meta 호출 측정: `/schedule` mount당 2회 (dev Strict Mode 영향, prod 1회 + 이후 30초 polling)
- Trigger 조건 모니터링 방법: Supabase dashboard의 `app_logs` 또는 별도 `metrics` 테이블로 호출 수 집계 (별도 작업)

## 참고

- `src/hooks/useScheduleMeta.ts` — 현재 polling 구현
- `src/lib/apiSync.ts` — self-sync window 발신측
- omni-radar 측정: `omni-radar/scripts/radar-query --url-contains "/api/academies/active/schedule-meta" --since 1h`
