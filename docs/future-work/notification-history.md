# 알림 히스토리 (Notification History)

## 배경

UAT 2026-05-10: 토스트 메시지가 자동으로 사라져 사용자가 놓친 알림을 다시 볼 수 없음. 특히 길거나 중요한 안내(동명이인 식별 안내, 검증 실패 코드 등)는 한 번 놓치면 추적 어려움.

본 토스트 UX 개선(D 스타일 — 헤더 + 본문 카드)으로 잘림 문제는 해결되지만, **사라진 알림 다시 보기** 요구는 별도 작업.

## 요구사항

1. 알림 발생 시 history table에 row 추가 (기존 토스트 표시는 유지)
2. 헤더/사이드바에 종 아이콘 + 미확인 카운트 배지
3. 클릭 시 패널 열림 — 최근 N개 알림 list (시간순 desc)
4. 알림별: variant 아이콘 / 헤더 라벨 / 본문 / 발생 시각 / 확인 여부
5. "전체 확인" / "지우기" 액션
6. 24-48시간 이상 retention 정책 (cron 기반 정리)

## 제외

- **`showUndoToast`**: action 버튼이 5초 deferred-commit과 결합된 임시 UI라 history에 남기면 의미 없음. 제외.
- **`showActionToast`**: 액션 만료된 후 history에 남으면 클릭 의미 없음. 액션은 제외하고 "메시지만 history에 기록" 정도.

## DB 스키마 (제안)

```sql
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  academy_id UUID REFERENCES academies(id),
  variant TEXT NOT NULL CHECK (variant IN ('success', 'error', 'warning', 'info')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_notification_history_user_recent
  ON notification_history (user_id, created_at DESC)
  WHERE read_at IS NULL;
```

retention: `created_at < now() - interval '7 days'` row 자동 삭제 (cron 또는 schedule).

## 구현 단계 (별도 PR)

1. **Schema migration** — `notification_history` table + RLS policy (user 본인 row만)
2. **lib/toast.ts wrapper** — `showSuccess/Error/Warning/Info` 호출 시 history insert (fire-and-forget). `showUndoToast`/`showActionToast`는 제외.
3. **NotificationBell 컴포넌트** — 헤더 종 아이콘 + 패널. SWR로 unread count 폴링 (또는 Realtime sub).
4. **확인/삭제 API** — `PATCH /api/notifications/[id]/read`, `DELETE /api/notifications`
5. **retention cron** — Supabase scheduled function 또는 별도 worker.

## 우선순위

🟡 **중간** — 핵심 기능 안정화 (검증 / 중복 정책 / Phase 1-10) 후. 사용자 피드백 누적 후 도입 결정.

