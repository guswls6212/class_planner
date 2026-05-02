# 학부모 접속 코드 시스템 — Design Spec

**Date:** 2026-05-02  
**Status:** Approved

---

## Context & Goals

**문제:**  
1. 공유 버튼(📤)이 member(강사)에게 /settings로 연결되지만, 강사에겐 공유 섹션이 없어 dead-end.  
2. 학부모에게 시간표를 공유하려면 학생별 링크 N개를 개별 전송해야 함 — 너무 불편.  
3. 기존 share_tokens 페이지는 학생/강사 필터를 자유롭게 선택 가능 → 다른 학생·강사 정보 탐색 가능.  
4. Settings 팀 멤버 목록에서 다른 강사의 이메일이 member에게 노출됨 (privacy 문제).

**목표:**  
- 원장이 **코드 1개**를 학부모에게 전달 → 학부모가 공개 URL에 코드 입력 → 내 아이 수업만 표시.  
- 강사 공유 버튼 제거.  
- Settings privacy 수정.

---

## 결정된 설계

### 1. 학원 공개 URL + 학생 접속 코드

**공개 URL:** `/academy/[academyId]` — 로그인 불필요한 공개 페이지  
&nbsp;&nbsp;→ `academyId`는 UUID 사용 (slug는 미구현, 향후 확장 가능)  
**코드 형식:** 학생 이름 앞 2자 + 숫자 + 알파벳 (예: `이현2A`, `강지4F`)  
&nbsp;&nbsp;→ 읽기 쉽고, 오타 줄임. 모호한 문자(0/O, 1/l/I) 제외.  
&nbsp;&nbsp;→ 이름이 1자인 경우: 이름 1자 + `_` + 숫자 + 알파벳 (예: `이_3K`).  
**코드 만료:** 발급일로부터 180일(6개월). 원장이 일괄 갱신 가능.  
**스코프:** 코드 1개 = 학생 1명의 전체 수업 (강사 무관). 다른 학생 접근 불가. 필터 UI 없음.

**학부모 흐름:**
```
URL 접속 → 코드 입력 → 내 아이 수업 표시 (read-only)
```

### 2. Settings — "학부모 접속 코드" 섹션 (원장 only)

- 학생별 코드 목록 + 만료일 + 복사 버튼
- "전체 코드 갱신" 버튼 → 기존 코드 만료 + 새 코드 일괄 생성
- "코드 시트 인쇄" 버튼 → 학생별 카드 레이아웃 PDF (학원명 + 학생명 + 코드 + URL)
- 새 학생 추가 시 자동으로 코드 생성 (기본 만료: 생성일 + 180일)
- 학생 삭제 시 연결된 코드 자동 revoke

### 3. 공유 버튼 (📤) 제거 — Member

`ScheduleActionBar.tsx`에서 share 버튼을 `canManage` 조건에 포함 → member에겐 숨김.  
Owner/admin: 기존 `/settings` 링크 유지 (공유 링크 관리는 settings에서).

### 4. Settings 팀 멤버 이메일 — Member에게 숨김

member 역할이 settings 페이지 팀 목록 조회 시:  
- 다른 강사 이메일 → `"이메일 비공개"` 텍스트로 대체  
- 원장 이메일 → 동일하게 숨김  
- 본인 이메일 → 그대로 표시  
- 이름, 상태(가입됨/초대 대기)는 그대로 표시

---

## Data Model

### 신규 migration: `share_tokens.access_code`

```sql
-- migration/migrations/040_share_tokens_access_code.sql
ALTER TABLE share_tokens
  ADD COLUMN IF NOT EXISTS access_code TEXT;

-- Unique per academy (one code per student per academy)
CREATE UNIQUE INDEX IF NOT EXISTS idx_share_tokens_access_code
  ON share_tokens (academy_id, access_code)
  WHERE access_code IS NOT NULL;
```

기존 `share_tokens` 구조 활용:
- `filter_student_id` → 이 학생 스코프 링크임을 표시
- `access_code` → 부모용 단기 코드 (예: `이현2A`)  
- `token` → 내부 UUID hex (기존 그대로, 롤백/관리용)
- `expires_at` → 180일 (6개월)
- `revoked_at` → 원장이 코드 폐기 시

---

## API Changes

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/academy/[academyId]/public` | 공개 학원 정보 반환 (학원명만) |
| `POST` | `/api/share/code` | 코드 검증 → 해당 학생 시간표 반환 |
| `POST` | `/api/share-tokens/access-codes/bulk` | 전체 학생 코드 일괄 생성 |
| `POST` | `/api/share-tokens/access-codes/renew` | 전체 코드 갱신 (기존 만료 + 신규) |

### `POST /api/share/code` 상세

```typescript
// body: { code: string, academyId: string }
// 1. share_tokens에서 access_code + academy_id 매칭 (만료 안 됨, revoked_at IS NULL)
// 2. filter_student_id로 해당 학생 수업 조회
// 3. 응답: { studentName, sessions, weekSchedule }
// 4. 존재하지 않으면 404 (코드 오류인지 만료인지 구분 안 함 — 보안)
```

### 코드 생성 규칙

```typescript
// 학생 이름 앞 2자 + 랜덤 숫자(1) + 랜덤 알파벳(1)
// 제외 문자: 0, O, 1, l, I (혼동 방지)
// 예: "이현진" → "이현" + "2" + "A" = "이현2A"
// 충돌 시 숫자/알파벳 재생성
function generateAccessCode(studentName: string): string
```

---

## UI Components

| Component | 변경 종류 | 파일 |
|-----------|-----------|------|
| 학원 공개 페이지 | **신규** | `src/app/academy/[academyId]/page.tsx` |
| 코드 입력 후 시간표 | **신규** | `src/app/academy/[academyId]/schedule/page.tsx` |
| Settings 학부모 코드 섹션 | **신규** | `src/app/settings/page.tsx` (섹션 추가) |
| Settings 이메일 숨김 | 수정 | `src/app/settings/page.tsx` (TeacherRow) |
| ScheduleActionBar share 버튼 | 수정 | `src/components/organisms/ScheduleActionBar.tsx` |

---

## Implementation Phases

| Phase | 내용 |
|-------|------|
| **1** | Migration 040 + 코드 생성 유틸 + `POST /api/share/code` |
| **2** | `/academy/[academyId]` 공개 페이지 + 시간표 뷰 |
| **3** | Settings 학부모 코드 섹션 + 일괄 생성 + 갱신 |
| **4** | 코드 시트 PDF 인쇄 + share 버튼 숨김 + 이메일 privacy |

---

## Out of Scope

- 강사가 직접 시간표 공유 (강사는 공유 권한 없음)
- 학부모 자체 로그인/계정
- SMS/이메일 자동 발송
- 드래그 핸들 숨김 (member에게 :: 핸들 보이는 문제 — 별도 작은 PR)

---

## Verification

- 원장이 학생 코드 생성 → 코드 복사 → `/academy/[id]`에 입력 → 해당 학생 수업만 표시
- 잘못된 코드 입력 → 에러 메시지 (코드 오류와 만료 구분 없이)
- 만료된 코드 → 동일 에러
- member 로그인 후 settings → 다른 강사 이메일 안 보임
- member 시간표 페이지 → 공유(📤) 버튼 없음
- 코드로 접속한 학부모 → 필터 UI 없음, 다른 학생 수업 안 보임
