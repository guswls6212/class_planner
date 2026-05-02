# Teacher Invite UX Redesign — Design Spec

**Date:** 2026-05-02  
**Status:** Approved  
**Scope:** class-planner

---

## Context & Goals

**문제:**  
초대 링크로 접속한 강사가 회원가입 없이 바로 학원 멤버가 되어버림. 또한 Settings 페이지에서 강사별 초대 상태를 직관적으로 파악하기 어렵고, 가입 강사가 시간표에 노출되는 본인 이름/색을 변조할 수 있는 보안 취약점이 존재.

**목표:**
1. 강사 초대 → 가입 유도하되 강제하지 않음. 비가입 강사도 view-only로 시간표 조회 가능.
2. 악의적 강사 정보 변조로부터 학생/학부모 노출 방지.
3. Settings에서 강사별 상태를 한눈에 파악하고, 컨텍스트에 맞는 액션을 즉시 실행.
4. Invite/share 토큰 보안 강화.

---

## 결정된 설계

### 1. 권한 모델 — Option A (Same role, signup = level-up)

강사 역할은 `member` 1종. 차이는 `teacher.user_id` 유무뿐.

- **익명 강사** (`user_id IS NULL`): 원장이 발급한 view-only share-link로 본인 시간표만 read-only 조회. 로그인 불필요.
- **가입 강사** (`user_id` 채워짐): 동일 member이지만 본인 contact 수정·알림·세션 internal note 가능.
- 익명 → 가입 전환: 동일 teacher 레코드에 `user_id`만 채움. 시간표·이력 그대로 유지.

### 2. Mitigations (M1–M6 전체 채택)

#### M1 — Field-level 권한 분리 (시간표 노출 필드 보호)

teacher 컬럼을 두 그룹으로 분리:

| 그룹 | 컬럼 | 편집 권한 |
|------|------|-----------|
| Public (시간표·UI 노출) | `name`, `color`, `role`, `status` | owner/admin만 |
| Private (강사 contact) | `email`, `phone`, `bio` | 본인 + owner/admin |

RLS `UPDATE` policy를 컬럼별로 작성. 강사가 본인 이름·색 변조 불가.

#### M2 — Audit trail + 1-click 롤백

```sql
CREATE TABLE audit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   uuid REFERENCES auth.users,
  action     text NOT NULL,   -- 'teacher.name.updated', 'invite.accepted', ...
  target_type text NOT NULL,  -- 'teacher', 'invite_token', 'session', ...
  target_id  uuid NOT NULL,
  before     jsonb,
  after      jsonb,
  at         timestamptz DEFAULT now()
);
```

Settings에 최근 변경 이력 패널 + 각 줄 "되돌리기" 버튼 → `before` jsonb로 복원.

#### M3 — Session note visibility 2-tier

sessions에 두 필드:
- `public_description`: 학생/학부모 share page에 노출. **owner/admin만** 편집.
- `internal_note`: 운영자+강사만 봄. 강사 편집 가능.

기존 `description` 컬럼이 있다면 `public_description`으로 rename. 데이터 유지.

#### M4 — Invite: 24h + email 매칭 + 수락 알림

- invite 생성 시 강사 email 등록 필수 (기존 선택 → 필수). `InviteModal` 수정.
- `expires_at = now() + interval '24 hours'` (기존 D-7 → 단축).
- accept 시 OAuth user email ≠ invite email → HTTP 403 + 안내 메시지.
- accept 성공 시 → `audit_log` INSERT + owner에게 in-app 알림 배지.

#### M5 — Share-link: expiry + revoke + watermark

- `share_tokens.expires_at` 기본 30일. 원장이 발급 시 7/30/90일 선택 가능.
- Settings에 active share-link 리스트 + revoke 버튼 (soft delete: `revoked_at` 채움).
- Share page 하단 watermark: `"○○○님께 발급된 시간표 · 2026-05-02"` — 유출 deterrent.

#### M6 — Admin/owner 권한 boundary 명시

| 권한 | owner | admin | member |
|------|:-----:|:-----:|:------:|
| 학원 삭제 | ✓ | — | — |
| Owner 양도 | ✓ | — | — |
| Admin 추가/제거 | ✓ | — | — |
| 강사 초대/제거 | ✓ | ✓ | — |
| 세션 편집 | ✓ | ✓ | — |
| 본인 contact 수정 | ✓ | ✓ | ✓ |

Admin은 owner 또는 다른 admin을 강등/제거할 수 없음. RLS + API에 guard 추가.

---

### 3. Invite 수락 페이지 — 4-state 재구성

`/invite/[token]` 는 user 상태에 따라 4개 화면 중 하나를 표시.

| State | 조건 | 핵심 UI | 주요 액션 |
|-------|------|---------|-----------|
| **A** | 비로그인 | 가입 CTA + "링크만 받기" | Google OAuth / share-link 요청 |
| **B** | 로그인, email 일치 | 초록 확인 배너 | "초대 수락" 단일 버튼 |
| **C** | 로그인, email 불일치 | 하드 리젝 경고 | "X@... 으로 전환하기" 버튼 |
| **D** | 이미 이 학원 멤버 | 자동 처리됨 안내 | "학원으로 이동하기" |

**State A "시간표 보기 링크만 받기" 흐름:**  
클릭 → 해당 teacher의 view-only share-link **즉시 자동 생성** + 화면에 링크 표시 → 학원장에게 in-app 알림 ("○○○님이 시간표 공유 링크로 참여했습니다"). 원장이 나중에 revoke 가능. 강사 상태 → `시간표 공유 중`.

**State C 처리:**  
"X@... 으로 전환하기" 클릭 → 현재 계정 로그아웃 → `/invite/[token]` 으로 redirect 유지.

---

### 4. Settings 페이지 — 통합 강사 리스트

"팀 멤버" + "대기 중인 초대" 두 섹션을 **강사 한 명 = 카드 한 개**로 통합.

#### 상태 pill 6종

| Pill | 조건 | 색 |
|------|------|----|
| `원장` | role = owner | amber |
| `가입됨` | user_id 연결 | green |
| `초대 대기 · D-N` | invite_token pending | yellow |
| `초대 만료` | token expired | red |
| `시간표 공유 중` | share_token active | blue |
| `미초대` | teacher record만 존재 | gray |

#### 상태별 ⋯ 메뉴

| 상태 | 메뉴 항목 |
|------|-----------|
| 미초대 | 초대 보내기 / 공유 링크 발급 / 강사 정보 수정 / 삭제 |
| 시간표 공유 중 | 초대로 승격 / 링크 재발급 / 공유 취소 |
| 초대 대기 | 링크 복사 / 재발송 / 초대 취소 |
| 초대 만료 | 재초대 |
| 가입됨 | 권한 변경 (member↔admin) / 강사 정보 / 팀에서 제외 |

자주 쓰는 액션("링크 복사", "재초대")은 카드 우측에 버튼으로 인라인 노출.

---

### 5. 강사 추가 모달 — Option C (Smart CTA)

입력 필드: 이름(필수), 과목, 이메일(선택).

**이메일 입력됨 →**
- Primary: "추가 + 초대 링크 발송"
- Secondary: "추가 + 시간표 공유 링크만"
- Tertiary: "일단 추가만 (나중에 결정)"

**이메일 없음 →**
- Primary: "추가 + 공유 링크 발급"
- Secondary: "일단 추가만"

힌트 박스: 이메일 입력 시 `"park@example.com 으로 초대 링크를 특정합니다 (보안)"` 표시. 이메일 없으면 `"이메일을 입력하면 초대 보안이 강화됩니다"`. 버튼 텍스트는 JS로 동적 변경.

---

### 6. Multi-academy

- 기존 schema: `UNIQUE(academy_id, user_id)` → 다중 학원 지원 구조 이미 존재.
- UI/UX는 단일 학원 가정으로 유지 (현재 5명 규모).
- 추후 학원 선택 dropdown으로 확장 시 코드 변경 최소화.

---

## Data Model Changes

### 신규 테이블

```sql
-- 035: audit_log (M2)
CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id  uuid REFERENCES academies NOT NULL,
  actor_id    uuid REFERENCES auth.users,
  action      text NOT NULL,
  target_type text NOT NULL,
  target_id   uuid NOT NULL,
  before      jsonb,
  after       jsonb,
  at          timestamptz DEFAULT now()
);
CREATE INDEX audit_log_academy_at ON audit_log (academy_id, at DESC);
```

### 기존 테이블 변경

```sql
-- 036: sessions note 분리 (M3)
-- 구현 전 sessions 테이블에 description 컬럼 존재 여부 확인 필요
ALTER TABLE sessions RENAME COLUMN description TO public_description;
ALTER TABLE sessions ADD COLUMN internal_note text;

-- 037: share_tokens 보안 강화 (M5)
ALTER TABLE share_tokens ADD COLUMN expires_at timestamptz DEFAULT now() + interval '30 days';
ALTER TABLE share_tokens ADD COLUMN revoked_at timestamptz;
ALTER TABLE share_tokens ADD COLUMN watermark_meta jsonb; -- {name, issued_at}

-- 038: invite expiry 단축 (M4) — 기존 데이터는 그대로, 신규 생성분에만 24h 적용
-- (코드 레벨에서 처리, migration 불필요)
```

> **선행 조건:** migration 032 (`expand_teachers_and_add_teacher_subjects`) 아직 미적용. 035~038 전에 반드시 먼저 적용.

### RLS 변경 (M1)

```sql
-- teachers UPDATE: public fields는 owner/admin만
CREATE POLICY "teachers_public_fields_owner_admin" ON teachers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM academy_members
      WHERE academy_id = teachers.academy_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (true);

-- teachers UPDATE: private fields는 본인 + owner/admin
-- (name, color 컬럼은 위 policy로만 허용되도록 column-level privilege 또는 trigger)
```

---

## API Changes

| Method | Path | 변경 내용 |
|--------|------|-----------|
| `POST` | `/api/invites` | email 필수, expires_at = now()+24h |
| `POST` | `/api/invites/accept` | email 매칭 검증, audit_log INSERT, owner 알림 |
| `POST` | `/api/invites/accept` | State A: share-link 자동 생성 엔드포인트 분기 |
| `GET` | `/api/teachers` | 상태 pill용 invite/share 상태 join 추가 |
| `PATCH` | `/api/teachers/[id]` | 요청 body에 `name`/`color` 포함 시 member role이면 403 반환. RLS는 defense-in-depth. |
| `POST` | `/api/share-tokens` | expires_at, watermark_meta |
| `DELETE` | `/api/share-tokens/[id]` | soft revoke (revoked_at 채움) |
| `GET` | `/api/audit-log` | owner/admin용 최근 이력 조회 |
| `POST` | `/api/audit-log/revert/[id]` | `audit_log.before` jsonb로 target 레코드 복원. target이 삭제됐거나 중간 변경이 있어도 before 값으로 덮어씀 (last-write-wins). 복원 자체도 audit_log에 기록. |

---

## UI Components

| Component | 변경 종류 | 현재 파일 |
|-----------|-----------|-----------|
| Settings page | 대규모 리팩터 (섹션 통합) | `src/app/settings/page.tsx` |
| InviteModal | email 필수, expire 24h, UI 업데이트 | `src/components/molecules/InviteModal.tsx` |
| Invite accept page | 4-state 재구성 | `src/app/invite/[token]/page.tsx` |
| TeacherAddModal | 신규 (Smart CTA) | `src/components/molecules/TeacherAddModal.tsx` |
| TeacherStatusPill | 신규 (atom) | `src/components/atoms/TeacherStatusPill.tsx` |
| AuditLogPanel | 신규 | `src/components/molecules/AuditLogPanel.tsx` |
| ShareLinkManager | 신규 | `src/components/molecules/ShareLinkManager.tsx` |

---

## Implementation Phases

| Phase | 내용 | 선행 조건 |
|-------|------|-----------|
| **0** | migration 032 적용 (pending) | — |
| **1** | audit_log 테이블 (035) + M1 RLS | Phase 0 |
| **2** | Settings 통합 리스트 + TeacherStatusPill | Phase 0 |
| **3** | Invite 4-state 재구성 (M4: 24h, email match, 알림) | Phase 0 |
| **4** | 강사 추가 모달 Smart CTA (TeacherAddModal) | Phase 2 |
| **5** | Share-link expiry + revoke + watermark (036+037, M5) | Phase 2 |
| **6** | Session note 2-tier (M3) + Admin/owner boundary (M6) | Phase 1 |

각 Phase는 독립 PR. Phase 0는 hotfix처럼 빠르게 선행.

---

## Out of Scope

- PIN/OTP 보조 인증 (M7, M8 — 미채택, 규모 커지면 재검토)
- 이메일/SMS 실제 발송 (owner 알림은 in-app 배지만)
- 강사 자기 프로필 페이지 (별도 기능)
- Rate-limit (M7 — audit trail로 사후 대응)

---

## Verification (Phase별)

**Phase 0:** migration 032 apply → `supabase db push` + schema inspector 확인.

**Phase 1:** `audit_log` 레코드 생성 확인. teacher name 변경 시 member role이면 403 반환 확인.

**Phase 2 (E2E):**
- Settings 강사 리스트에 6종 pill 모두 렌더링
- ⋯ 메뉴 상태별 항목 노출 확인

**Phase 3 (E2E):**
- 비로그인 접속 → Google OAuth 버튼 + "링크만 받기" 표시
- 다른 email로 로그인 후 접속 → 하드 리젝 + 전환 버튼 표시
- 이미 멤버 → "학원으로 이동" 표시
- invite email 불일치 accept → API 403

**Phase 4:** 이메일 입력/미입력에 따라 Primary 버튼 텍스트 동적 변경 확인.

**Phase 5:** share-link 30일 후 만료 확인 (수동 expires_at 조작). revoke 후 접속 시 404.
