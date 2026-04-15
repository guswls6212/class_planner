# Member Invite Feature — Design Spec

**Date:** 2026-04-14
**Phase:** 2A 마무리 (Academy 멀티테넌트 완성)
**Author:** HYUNJIN + Claude
**Status:** Draft

---

## Context

class-planner는 Phase 2A에서 JSONB 단일 테이블 구조 → `academy_id` 기반 멀티테넌트 정규화 구조로 전환했다. `academy_members` 테이블에 `invited_by`, `role` 컬럼은 마련되어 있으나, owner 외 다른 역할(admin/member)을 추가하는 실제 경로가 없다. 현재 5명의 사용자는 모두 self-onboarded owner 상태이며, 학원 운영을 강사/관리자와 함께 하려면 초대 기능이 필요하다.

본 스펙은 Phase 2A 남은 항목 중 "운영자 초대 기능"을 다룬다. 이메일 발송 인프라 없이도 동작하는 **초대 링크 방식**을 채택하며, 이메일 초대는 향후 Phase에서 확장한다.

---

## Goals / Non-Goals

**Goals:**
- owner/admin이 초대 링크를 생성하여 공유할 수 있다.
- 초대받은 사용자가 링크를 통해 해당 학원의 멤버(admin 또는 member)로 가입할 수 있다.
- owner/admin이 학원 멤버 목록을 조회하고, 기존 멤버를 제거할 수 있다.
- 1회용 + 7일 만료 기반 안전성 확보.

**Non-Goals:**
- 이메일 발송 (Phase 2A 이후 확장)
- 멀티 academy 사용자의 academy 전환 UI (별도 Phase)
- 역할 변경 UI (member ↔ admin 승격/강등) — 필요 시 별도 개선

---

## Data Model

### 신규 테이블: `invite_tokens`

```sql
CREATE TABLE public.invite_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role       TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invite_tokens_academy_id ON public.invite_tokens(academy_id);
CREATE INDEX idx_invite_tokens_token ON public.invite_tokens(token);
```

### RLS 정책

**`invite_tokens`:**
- SELECT: owner/admin만 (`EXISTS (SELECT 1 FROM academy_members WHERE academy_id = invite_tokens.academy_id AND user_id = auth.uid() AND role IN ('owner','admin'))`)
- INSERT/DELETE: owner/admin만 (동일 조건)
- UPDATE(used_by, used_at 기록): service_role 전용 (API에서 처리)

**`academy_members`:**
- 기존 SELECT 정책 유지
- **DELETE 정책 추가**: owner만 (`EXISTS (SELECT 1 FROM academy_members am2 WHERE am2.academy_id = academy_members.academy_id AND am2.user_id = auth.uid() AND am2.role = 'owner')`)
- INSERT는 계속 service_role로 처리 (온보딩 패턴과 일관)

### 마이그레이션 파일

- `migration/migrations/020_create_invite_tokens.sql` — 테이블 + RLS
- `migration/migrations/021_academy_members_delete_policy.sql` — DELETE 정책 추가

---

## API Routes

| Method | Path | 역할 | 인증 |
|--------|------|------|------|
| `POST` | `/api/invites` | 초대 토큰 생성 | owner/admin |
| `GET` | `/api/invites` | 대기 중 초대 목록 | owner/admin |
| `DELETE` | `/api/invites/[id]` | 초대 취소 | owner/admin |
| `POST` | `/api/invites/accept` | 초대 수락 | 로그인 사용자 |
| `GET` | `/api/members` | 학원 멤버 목록 | 학원 멤버 (모든 역할) |
| `DELETE` | `/api/members/[userId]` | 멤버 제거 | owner |

### POST /api/invites
Body: `{ role: 'admin' | 'member' }`
Flow:
1. `resolveAcademyId(userId)` → academyId
2. `academy_members` 조회 → role이 owner/admin인지 확인
3. `invite_tokens` INSERT (service_role)
4. Response: `{ id, token, role, expiresAt }`

### POST /api/invites/accept
Body: `{ token: string }`
Flow:
1. `invite_tokens` 조회 (service_role)
2. 유효성 검증: `expires_at > now() AND used_by IS NULL`
3. 이미 멤버인지 확인 (`academy_members` where `user_id = auth.uid() AND academy_id = token.academy_id`)
   - 이미 멤버 → 200 `{ academyId, alreadyMember: true }` (멱등)
4. `academy_members` INSERT (`role = token.role`, `invited_by = token.created_by`)
5. `invite_tokens` UPDATE (`used_by = auth.uid()`, `used_at = now()`)
6. `onboarded=1` 쿠키 설정
7. Response: `{ academyId, academyName }`

### GET /api/invites
Response: 현재 academy의 미사용·미만료 토큰 리스트
```json
[{ "id": "...", "role": "admin", "expiresAt": "...", "token": "..." }]
```

### DELETE /api/members/[userId]
- owner 본인은 제거 불가 (400)
- 본인이 owner인지 검증 후 `academy_members` DELETE

---

## UI

### `/settings` 페이지 (신규)
3개 섹션:
1. **학원 정보** — 학원명 조회/수정 (owner만 수정 가능)
2. **멤버 목록** — 멤버 카드 (이름, 역할 배지) + "초대하기" 버튼 + 제거 버튼
3. **대기 중인 초대** — 미사용 토큰 목록, 링크 복사 + 취소 버튼

컴포넌트 분류 (Atomic Design):
- `organisms/SettingsPageLayout.tsx` — 전체 레이아웃
- `organisms/MembersSection.tsx` — 멤버 + 초대 섹션 통합
- `molecules/MemberListItem.tsx`
- `molecules/PendingInviteListItem.tsx`
- `molecules/InviteModal.tsx` — 역할 선택 + 링크 생성

### `/invite/[token]` 페이지 (신규)
서버 컴포넌트에서 토큰 조회 → 학원명/역할 안내.

상태별 분기:
- 비로그인: Google/Kakao 로그인 버튼. `redirectTo`에 `/invite/[token]` 포함 + localStorage에 token 백업 (OAuth 리다이렉트 안정성 확보)
- 로그인 + 유효 토큰: "수락" 버튼 → `POST /api/invites/accept` → `/schedule`
- 로그인 + 이미 멤버: "이미 가입된 학원입니다" 메시지 + `/schedule` 이동 버튼
- 만료/사용됨/없음: 에러 메시지 + 홈 이동

컴포넌트:
- `app/invite/[token]/page.tsx` — 서버 컴포넌트 (SSR 토큰 검증)
- `components/organisms/InviteAcceptCard.tsx` — 클라이언트 인터랙션

---

## Error Cases

| 상황 | HTTP | 메시지 |
|------|------|--------|
| 토큰 없음/잘못됨 | 404 | 유효하지 않은 초대 링크 |
| 만료됨 | 410 | 만료된 초대 링크 (생성일로부터 7일 경과) |
| 이미 사용됨 | 410 | 이미 사용된 초대 링크 |
| 이미 해당 academy 멤버 | 200 | `{ alreadyMember: true }` — 에러 아닌 멱등 |
| 초대 생성 권한 없음 (member) | 403 | 초대 권한이 없습니다 |
| owner 자기 자신 제거 시도 | 400 | 원장 본인은 제거할 수 없습니다 |

---

## Testing Strategy

| 계층 | 대상 | 목표 |
|------|------|------|
| Domain/Application | `isInviteValid(token)` 유효성 함수 | 100% |
| API Routes | 6개 엔드포인트 × 정상/에러 경로 | 90%+ |
| Presentation (RTL) | InviteModal, MemberListItem, InviteAcceptCard | 70%+ |
| E2E (Playwright) | 골든 패스 1개 | 작동 확인 |

**E2E 골든 패스:**
owner A 로그인 → /settings → "초대하기" → admin 역할 선택 → 링크 복사 → 로그아웃 → 링크 접속 → 새 계정 B로 로그인 → 자동 수락 → /schedule 도달 → /settings에서 B가 admin으로 표시되는지 확인.

---

## Security Considerations

- 토큰은 `gen_random_bytes(32)` 기반 (256비트 엔트로피, 예측 불가)
- RLS로 다른 academy의 토큰 조회 차단
- DELETE 멤버는 owner만 가능 (RLS로 이중 검증)
- 초대 수락은 `auth.uid()` 검증 필수 (로그인 상태만 허용)
- CSRF: Next.js Route Handler는 same-origin 기본값, accept 엔드포인트는 인증된 사용자만 가능하므로 추가 토큰 불필요

---

## Migration & Cleanup Plan

**Phase 1 (선행):** `019_drop_user_data.sql` 적용 — 본 초대 기능과 독립된 정리 작업
**Phase 2 (본 스펙):**
1. `020_create_invite_tokens.sql` + `021_academy_members_delete_policy.sql`
2. API Routes 6개 구현
3. /settings 페이지 + /invite/[token] 페이지
4. 테스트 작성
5. E2E 검증
6. PR → CI → dev 머지

---

## Devil's Advocate

### Weaknesses
1. **이메일 없이 링크 공유** — 잘못된 상대에게 전달될 위험. 완화책: 1회용 + 짧은 만료. 현재 5명 소규모 운영 상황에서 수용 가능한 trade-off.
2. **OAuth 콜백 후 토큰 복구** — Supabase Auth가 redirectTo 파라미터를 제한적으로만 지원. localStorage 백업(`pending_invite_token`)으로 보완.
3. **resolveAcademyId의 멀티 academy 미대응** — 한 사용자가 여러 학원 멤버일 때 현재는 "첫 번째"만 반환. 본 스펙에서는 그대로 두되, 초대 수락 시점에 이미 해당 academy의 멤버면 멱등 처리하여 혼란 방지.

### Rejected Alternatives
- **이메일 초대 먼저**: Resend/SES 셋업 비용 + 개발 환경 테스트 복잡도. 링크 방식이 MVP로 더 적합.
- **academy_members에 pending status 추가**: 모든 멤버십 쿼리에 `status = 'active'` filter 추가 → 부작용이 넓다. 관심사 분리를 위해 invite_tokens 전용 테이블 채택.

### Uncertainties
- **OAuth redirectTo 동작**: Supabase Auth의 redirect 동작을 구현 시 검증 필요. 실패 시 localStorage 백업이 fallback으로 작동.
- **멤버 삭제 시 자식 데이터**: 멤버 제거 시 그 사람이 만든 students/subjects/sessions는 academy 소유이므로 그대로 유지. 삭제된 멤버의 `invited_by` 값은 `ON DELETE SET NULL`로 정리됨.

---

## Success Criteria

- [ ] owner가 /settings에서 초대 링크를 30초 내 생성·복사 가능
- [ ] 초대받은 사람이 로그인 후 1클릭으로 수락 완료
- [ ] 만료된/이미 쓴 토큰은 명확한 에러 메시지
- [ ] owner가 멤버를 제거할 수 있음
- [ ] 기존 1095 tests + 신규 테스트 모두 통과
- [ ] E2E 골든 패스 1개 통과

---

## References

- `docs/adr/002-academy-multitenant-architecture.md` — academy_members 설계 배경
- `src/app/api/onboarding/route.ts` — 유사한 service_role INSERT 패턴
- `src/lib/resolveAcademyId.ts` — userId → academyId 유틸
- `migration/migrations/016_create_academy_tables.sql` — academy_members 원본 스키마
- `migration/migrations/017_rls_academy_based.sql` — 현재 RLS 정책
