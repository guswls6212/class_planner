# Multi-Academy User Support — Design Spec

**Date:** 2026-05-02  
**Status:** Approved

---

## Context & Goals

**문제:** `resolveAcademyMembership`이 `LIMIT 1` (비결정적)으로 설계돼 한 사용자가 여러 학원에 속할 경우 어떤 학원이 선택될지 불확실. UI에 학원 전환 수단 없음.

**목표:** 한 계정이 학원A 원장 + 학원B 강사일 때 명확하게 전환 가능. 데이터 꼬임 없음.

---

## 핵심: 데이터 안전성

### localStorage 스코프 분리 (가장 중요)

**현재:** `classPlannerData:{userId}` — 학원 구분 없음 → 데이터 혼재 위험  
**변경:** `classPlannerData:{userId}:{academyId}` — 학원별 완전 분리 (구현 후 실제 키, `getStorageKey` in `src/lib/localStorageCrud.ts`)

모든 localStorage 읽기/쓰기 함수가 academyId를 포함한 키 사용. 각 학원의 학생/과목/수업은 독립된 스코프에 저장.

### Active Academy 관리

**저장 위치:** `localStorage.setItem('active_academy_{userId}', academyId)` (쿠키도 병행)

**전환 시 흐름:**
1. 사용자가 UI에서 다른 학원 선택
2. `active_academy_{userId}` 업데이트
3. 미들웨어/API가 이 값으로 올바른 학원 컨텍스트 사용
4. 새 학원 localStorage 스코프가 비어있으면 서버 bootstrap fetch
5. 페이지 리로드 (깔끔한 상태 초기화)

### `resolveAcademyMembership` 개선

**현재:** `LIMIT 1` (비결정적)  
**변경:** `active_academy_id` 쿠키/헤더가 있으면 해당 academy_id 우선 조회. 없으면 owner 역할 우선 반환.

```typescript
// 우선순위:
// 1. active_academy_id 쿠키에 명시된 경우
// 2. role = 'owner'인 학원
// 3. role = 'admin'인 학원
// 4. role = 'member'인 학원
.order('role', { ascending: true })  // member < admin < owner
```

---

## UI 설계

### Academy Switcher (사이드바)

**위치:** 사이드바 최상단 로고 버튼 (현재 "CP" 표시)  
**트리거:** 로고 클릭 → 드롭다운

**드롭다운 내용:**
```
내 학원
  [현] 현진학원     원장    ✓ (현재)
  [다] 다른학원     강사
──────────
  + 새 학원 만들기
```

**시각적 구분:** 학원마다 색상 + 이니셜 (현진학원 → amber 배경 "현진", 다른학원 → blue 배경 "다른")  
**상단 헤더:** 현재 학원명 표시  
**역할 반영:** 전환 후 강사 역할이면 학생/과목/강사 nav 자동 숨김

### 로그인 후 학원 선택 (단일 학원이면 스킵)

1개 학원 → 기존 동작 그대로 (학원 선택 화면 없음)  
2개+ 학원 → onboarding 직후 또는 처음 진입 시 학원 선택 화면 표시

---

## API 변경

| 변경 | 설명 |
|------|------|
| `GET /api/members` | active_academy_id 쿠키 우선 적용 |
| `resolveAcademyMembership` | 우선순위 정렬 + active_academy 지원 |
| `POST /api/auth/set-active-academy` | 학원 전환 시 active_academy 쿠키 설정 |
| `GET /api/academies/mine` | 현재 사용자의 모든 학원 목록 반환 |

---

## 구현 순서 (PR 2 — Slug 이후)

| Phase | 내용 |
|-------|------|
| **1** | localStorage 키 변경 (`_{academyId}` suffix) + bootstrap sync 로직 |
| **2** | `resolveAcademyMembership` 우선순위 정렬 + active_academy 쿠키 지원 |
| **3** | `GET /api/academies/mine` + `POST /api/auth/set-active-academy` |
| **4** | 사이드바 Academy Switcher UI |
| **5** | 학원 전환 플로우 (전환 → bootstrap → reload) |

---

## Data Migration Notes

기존 `classPlannerData:{userId}` localStorage 키 → 처음 로드 시 `classPlannerData:{userId}:{academyId}`로 마이그레이션 (one-time). 기존 데이터 유실 없음.

---

## Out of Scope

- 한 브라우저에서 두 학원 동시 표시 (Tab 기반)
- 학원 간 학생/과목 복사
- 초대 없이 다른 학원에 자율 가입

---

## Verification

1. 사용자가 2개 학원에 속할 때 학원 선택 드롭다운 표시 확인
2. 학원 A → B 전환 후 B의 학생 목록이 보임 (A 학생 없음)
3. B에서 학생 추가 시 A에 영향 없음 (localStorage 분리)
4. B에서 member 역할이면 학생/과목 nav 숨김
5. 페이지 새로고침 후에도 B 학원 컨텍스트 유지
