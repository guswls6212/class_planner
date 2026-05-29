# 출결 date key 의 timezone 일관성 (follow-up)

> 발견: 2026-05-29, attendance-ux-redesign Phase A/B (teacher-attendance-access) 의
> adversarial review 중. 본 PR 에서 **member-facing 두 surface 는 통일**했고,
> 나머지(`/schedule`)는 pre-existing 라 별도 follow-up 으로 분리.

## 배경

출결 기록은 `(sessionId, date YYYY-MM-DD)` 로 keyed 된다. 같은 수업 occurrence
(weekStartDate W + weekday D) 에 대해 모든 진입점이 **동일한 date 문자열**을
계산해야 기록이 일치한다.

현재 진입점별 date 계산 방식:

| 진입점 | 계산 | timezone 의존 |
|---|---|---|
| `/attendance` (일별) | `formatLocalISO(selectedDate)` | browser-local |
| `/attendance` (주별, 신규) | `instanceDateFromWeekStart(weekStartISO, weekday)` | **무관 (calendar 산술)** |
| `/teacher-schedule` (신규) | `instanceDateFromWeekStart(...)` | **무관 (calendar 산술)** |
| `/schedule` (owner/admin, 기존) | `selectedDate.toISOString().slice(0,10)` (8곳) | **UTC** |

## 본 PR 에서 한 것

- 신규 `lib/dateUtils.ts` `instanceDateFromWeekStart(weekStartISO, weekday)` —
  YYYY-MM-DD 문자열을 local 달력으로 파싱 후 +weekday 일. round-trip 이라
  timezone 무관하게 입력 달력값 기준 결정적. teacher-schedule(출결 모달) 과
  /attendance(주별) 가 이 helper 를 공유 → 두 member-facing surface 는 모든
  timezone 에서 date key 일치.
- (이전 teacher-schedule 초안의 `new Date(\`${ws}T12:00:00+09:00\`)` + browser-local
  `getDate()` 조합은 category 오류 — KST instant 앵커를 browser-local getter 로
  읽어 non-KST 에서 off-by-one. 제거됨.)

## 남은 것 (이 follow-up)

1. **`/schedule` 의 `toISOString().slice(0,10)` (8곳)** 를 `formatLocalISO` 또는
   `instanceDateFromWeekStart` 로 통일. owner/admin 이 마킹하고 member 가
   /attendance·/teacher-schedule 에서 보는 cross-role 시나리오에서 non-KST
   browser 일 때 date key 가 어긋날 수 있다.
   - **주의**: date key 계산 방식을 바꾸면 **기존에 저장된 출결 레코드의 key 와
     불일치**가 생긴다 (orphan). 단순 치환 X — 기존 데이터 마이그레이션/매핑
     필요. 그래서 본 PR 에서 제외.
2. **`/attendance` 일별의 `formatLocalISO(selectedDate)` + 세션 필터
   `s.weekStartDate === weekStartISO`** 도 browser-local 기반. non-KST 에서
   `getWeekStart(now)` 가 KST 와 다른 주를 가리키면 세션이 안 보일 수 있다
   (빈 화면 — 데이터 손상은 아님). KST 전용 사용자(현 전부)는 무영향.

## 실제 영향도

- 현 사용자 100% 가 한국(KST) 운영자/강사 — browser tz = KST → 모든 방식이 동일
  결과. **production 영향 0.** 이론적 non-KST 클라이언트에서만 발생.
- 우선순위 **낮음**. 글로벌 배포 또는 non-KST QA 도입 시 트리거.

## 트리거

- 앱이 KST 외 timezone 사용자에게 노출될 때.
- 또는 출결 SSOT 를 서버 KST 고정(`getWeekStartDate`, weekStart.ts 패턴)으로
  일원화하는 리팩터를 할 때 함께.

## 권장 방향

`lib/weekStart.ts` 의 `getWeekStartDate`(KST 고정)와 신규
`instanceDateFromWeekStart` 를 출결 date 계산의 SSOT 로 삼아 3 surface 전부
통일 + 기존 레코드 마이그레이션 스크립트 동반.
