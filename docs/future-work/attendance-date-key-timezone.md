# 출결 date key 의 timezone 일관성 (follow-up)

> 발견: 2026-05-29, attendance-ux-redesign Phase A (teacher-attendance-access) 의
> adversarial review 중. teacher-schedule 출결 진입의 date 계산을 tz-무관으로
> 통일했고, 나머지(`/schedule`)는 pre-existing 라 별도 follow-up 으로 분리.

## 배경

출결 기록은 `(sessionId, date YYYY-MM-DD)` 로 keyed 된다. 같은 수업 occurrence
(weekStartDate W + weekday D) 에 대해 모든 진입점이 **동일한 date 문자열**을
계산해야 기록이 일치한다.

진입점별 date 계산 방식:

| 진입점 | 계산 | timezone 의존 |
|---|---|---|
| `/teacher-schedule` (출결 모달, 신규) | `instanceDateFromWeekStart(weekStartISO, weekday)` | **무관 (calendar 산술)** |
| `/attendance` (일별) | `formatLocalISO(selectedDate)` | browser-local |
| `/schedule` (owner/admin) | `selectedDate.toISOString().slice(0,10)` (8곳) | **UTC** |

> `/attendance` 전용 페이지는 2026-05-29 사용자 결정으로 **nav 에서 제거**
> (출결은 시간표 블록 클릭으로만 진입). 페이지 자체는 URL 직접 진입용으로
> 기존 동작(formatLocalISO) 그대로 남아 있다.

## 본 PR 에서 한 것

- 신규 `lib/dateUtils.ts` `instanceDateFromWeekStart(weekStartISO, weekday)` —
  YYYY-MM-DD 문자열을 local 달력으로 파싱 후 +weekday 일. round-trip 이라
  timezone 무관하게 입력 달력값 기준 결정적.
- teacher-schedule 출결 모달이 이 helper 로 occurrence date 를 계산
  (이전 초안의 `new Date(\`${ws}T12:00:00+09:00\`)` KST instant 앵커 + browser-local
  `getDate()` 조합은 category 오류 — non-KST 에서 off-by-one. 제거됨).

## 남은 것 (이 follow-up)

1. **`/schedule` 의 `toISOString().slice(0,10)` (8곳)** + **`/attendance` 일별의
   `formatLocalISO`** 를 KST 고정 SSOT 로 통일. owner/admin 이 /schedule 에서
   마킹하고 강사가 teacher-schedule 에서 보는 cross-surface 시나리오에서 non-KST
   browser 일 때 date key 가 어긋날 수 있다.
   - **주의**: date key 계산 방식을 바꾸면 **기존 저장된 출결 레코드의 key 와
     불일치**(orphan)가 생긴다. 단순 치환 X — 마이그레이션/매핑 동반 필요.

## 실제 영향도

- 현 사용자 100% 가 한국(KST) 운영자/강사 — browser tz = KST → 모든 방식이 동일
  결과. **production 영향 0.** 이론적 non-KST 클라이언트에서만 발생. 우선순위 낮음.

## 트리거

- 앱이 KST 외 timezone 사용자에게 노출될 때, 또는 출결 SSOT 를 서버 KST 고정
  (`getWeekStartDate`, weekStart.ts 패턴)으로 일원화하는 리팩터 시 함께.

## 권장 방향

`lib/weekStart.ts` `getWeekStartDate`(KST 고정) + `instanceDateFromWeekStart` 를
출결 date 계산 SSOT 로 삼아 3 surface 전부 통일 + 기존 레코드 마이그레이션 동반.
