# Academy Slug — Design Spec

**Date:** 2026-05-02  
**Status:** Approved

---

## Context & Goals

**문제:** 학부모 공개 URL `/academy/829d7cc2-7fe9-...` 가 UUID라 읽기 불편하고 브랜딩이 없음.  
**목표:** 가독성 + 브랜딩. 보안 목적 아님 (UUID 노출은 보안 문제 없음).

---

## 설계

### Slug 형식

- 한글 학원명 그대로 사용 권장 (예: `현진학원`)
- 영어/숫자/하이픈도 허용
- 최소 2자, 최대 50자
- 공백 → 하이픈 자동 변환
- 중복 시: 자동 suffix 대신 사용자에게 알림

### DB 변경

```sql
-- migration/migrations/041_academy_slug.sql
ALTER TABLE academies
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_academies_slug ON academies (slug);
```

기존 학원: 첫 로그인 시 또는 Settings 방문 시 자동 생성 (학원명 기반).

### Settings — Slug 편집 UX

**실시간 중복 확인 (UX 핵심):**
- 사용자가 slug 입력 → 500ms debounce → `GET /api/academies/check-slug?slug=xxx` 호출
- 사용 가능: 초록 체크 + "사용 가능한 slug입니다"
- 중복: 빨간 경고 + "이미 사용 중인 slug입니다. 다른 이름을 입력해주세요."
- 변경 버튼: slug가 유효할 때만 활성화 (disabled otherwise)

**기존 slug 변경 시 — 영향 범위 경고 (중요):**
```
⚠️ slug를 변경하면 다음이 영향을 받습니다:
• 학부모 접속 코드 URL — 부모님들이 저장한 /academy/[현재slug] 링크가 깨집니다
• 새 URL: /academy/[새slug]로 변경됩니다

기존 URL (/academy/[현재slug])은 자동으로 새 URL로 리다이렉트됩니다.
```

경고 확인 checkbox (`위 내용을 확인했습니다`) 후 "slug 변경하기" 버튼 활성화.

### URL 변화

| 이전 | 이후 |
|------|------|
| `/academy/829d7cc2-...` | `/academy/현진학원` |
| UUID 직접 접속 | 301 redirect → slug URL |

**Redirect 전략:** UUID URL로 접속 시 slug로 301 redirect (UX 자연스럽게).

### API 변경

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/academies/check-slug?slug=xxx` | 중복 확인 (public, no auth) |
| `PATCH` | `/api/academies/[id]/slug` | slug 변경 (owner only) |
| `GET` | `/api/academy/[slug]/public` | slug로 학원 조회 (기존 UUID도 지원) |

### `/academy/[identifier]` 라우팅

URL 파라미터가 UUID면 → slug로 redirect.  
UUID 형식 아니면 → slug로 처리.

```typescript
function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(s)
}
// page.tsx에서:
if (isUUID(identifier)) {
  // GET /api/academy/[uuid]/public → { slug } → redirect
}
```

---

## Verification

1. 학원 생성 시 slug 자동 생성 확인
2. Settings에서 slug 변경 → 중복 실시간 체크 확인
3. 기존 slug 변경 시 경고 표시 + checkbox 후 활성화 확인
4. `/academy/UUID` 접속 → `/academy/slug` redirect 확인
5. 새 slug URL로 접속 코드 정상 작동 확인
