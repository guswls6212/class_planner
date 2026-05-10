# ADR-015: 강사 권한 도메인 분리 + Schedule Picker 표시 정책

- **Status:** Accepted
- **Date:** 2026-05-10
- **Related PR:** UAT 2026-05-10 후속 PR (강사 detail 색상/역할/저장 흐름 + schedule picker 동명이인)
- **Related ADR:** ADR-014 (동명이인 정책 일관성 + Toast SSOT), ADR-012 (fire-and-forget vs await for CUD)

## Context

UAT 2026-05-10 추가 사이클에서 사용자가 5건을 보고했고, 모두 강사 권한 도메인 + schedule picker UX와 연결돼 있다.

1. **TeacherDetailPanel 색상 즉시 저장 회귀** — `handleColorClick`이 400ms debounce 후 자동 commit. 이름/이메일 등은 "저장" 버튼이 필요한데 색상만 자동 commit이라 사용자 멘탈 모델 위반.
2. **저장/취소 버튼 위치** — 폼 안 메모 다음에 있고 색상 섹션은 폼 외부. 사용자: "저장/취소를 가장 아래에 두는 게 일관적".
3. **강사 detail에서 역할 변경(admin↔member) 의미** — 사용자 발화: "관리자 부여는 settings의 invite 흐름이라 강사 detail에서 역할 변경 가능한 것은 의미 없음". teacher 카탈로그 도메인과 membership 권한 도메인 혼동.
4. **강사 칩에 admin/owner 표시** — schedule modal pill picker가 모든 teacher 표시. 관리자 강사가 픽커에 노출돼 사용자 의도 위반.
5. **schedule 모달 동명이인 구분 불가** — `filterEditableStudents`가 name+id만 반환. 같은 이름이 여러 명일 때 누가 누군지 모름. layout 페이지(`StudentsPageLayout`/`TeachersPageLayout`)는 이미 동명이인 시 부제 표시 — 같은 패턴이 모달에 미적용.

이 ADR은 위 5건의 fix 방향과 향후 회귀 방지 규칙을 박제한다.

## Decision

### D1: 색상은 폼 일부 — autosave 금지

`TeacherDetailPanel`의 색상 변경은 다른 편집 필드와 동일하게 "저장" 버튼 클릭 시에만 commit. 화면상 swatch 클릭은 preview만 (state 갱신). 취소 시 원래 색으로 복원(`useEffect([teacher.id])`가 reset).

규칙:
- Detail 편집 폼 안에 모든 변경 필드 통합 (이름 / 이메일·전화 / 메모 / 색상 / 저장·취소)
- 저장/취소 버튼은 폼의 가장 아래 위치
- "X 변경 시 자동 commit" 패턴은 신규 도입 금지 (명시적 사용자 액션 필요)

### D2: 강사 권한 도메인 분리 — Detail은 권한 변경 X

**강사 카탈로그(teacher catalog)**와 **멤버십 권한(membership role)**은 별도 도메인:

- 강사 카탈로그: `/teachers` 페이지 + TeacherDetailPanel — 학원 운영의 강사 정보(이름/색상/연락처/메모)
- 멤버십 권한: `/settings` 페이지 멤버 관리 + `/api/members/:userId` PATCH — 학원 계정의 admin/member 부여

`TeacherDetailPanel`에서는 역할 변경 UI 미노출. 보기 모드 표시는 유지(역할 인지 가치) + "역할 변경: Settings → 멤버" 작은 안내 hint. `useTeacherManagementLocal.updateTeacher`의 role 필드 시그니처는 그대로 (settings 호출자 보존).

### D3: Schedule picker는 강사(member)만 — selected 예외 보존

`TeacherPillPicker`/`TeacherFilterChipBar`에 노출되는 강사는 기본적으로 `role === 'member'` (또는 null/unknown). admin/owner는 강사 카탈로그 외 권한 멤버이므로 schedule 도메인에 노출하지 않는다.

예외 — **`selectedTeacherId`가 admin/owner인 경우 픽커에 보존**. legacy session(role 정책 도입 전 admin이 강사로 배정됨) 편집 시 사용자 작업이 끊기지 않도록. selected admin pill에는 작은 회색 "관리자" 부제 표시.

구현 SSOT: `src/lib/teacherPickerFilter.ts`
- `isAdminRole(role)` — `'admin' | 'owner'` 판정
- `filterTeachersForPicker(teachers, selected?)` — 단일 selected ID 또는 selected ID array 모두 보존

### D4: 동명이인 부제 SSOT — `lib/duplicateLabel.ts`

`StudentsPageLayout` / `TeachersPageLayout`에 흩어져 있던 동명이인 부제 inline 함수를 helper로 통일. schedule 모달의 학생 검색·강사 picker도 동일 helper 사용.

규칙:
- 같은 이름이 같은 list에 2명 이상이면 식별 정보(학생: 성별·생년월일, 강사: 이메일·전화)를 부제로 노출
- 식별 정보 없으면 fallback (학생: 학년·학교 → "프로필 미입력 · 동명이인", 강사: 빈 문자열 — 호출부가 "주간 N회 · 동명이인" 같은 자체 fallback)
- subtitle 표시 형식: 한 줄 inline `"이름 · subtitle"` (회색 작은 텍스트, 모바일 친화)

구현 SSOT: `src/lib/duplicateLabel.ts`
- `buildDuplicateNameSet<T extends {name:string}>(items)` — 동명이인 set 빌드
- `formatStudentDuplicateLabel(s, dupSet)` / `formatTeacherDuplicateLabel(t, dupSet)`

## Consequences

### 긍정적
- **권한 도메인 명확화** — teacher catalog ≠ membership role. 향후 새 권한 기능 도입 시 settings에 집중.
- **회귀 가드** — picker에 admin 노출 또는 동명이인 식별 부재 같은 회귀가 helper SSOT 위반으로 즉시 발견.
- **사용자 멘탈 모델 일관성** — "저장 안 누르면 변경 안 됨" 규칙이 모든 detail 편집에 통일.

### 부정적 / 위험
- 강사 detail에서 role 변경하는 UX가 사라져, settings를 모르는 신규 사용자 혼동 가능 → 보기 모드 hint("역할 변경: Settings → 멤버")로 완화.
- legacy admin 배정 session은 schedule pill picker에 그대로 노출 + "관리자" 부제 — 사용자가 "왜 이 사람이 강사로 보이지?" 의문 가능. 다음 마이그레이션에서 legacy session의 teacherId를 명시 처리하는 것을 검토 대상으로 (별도 작업).

### 위반 가드
- 신규 strands에 `showToast`/`onUpdate` 자동 commit 패턴 도입 시 ADR-015 위반 review 의무
- picker에 teachers prop을 narrow projection (id/name/color)으로 전달하면 admin 필터/동명이인 부제가 동작 안 함 → typed `TeacherPickerOption` 사용 의무

## Rejected Alternatives

- **Picker에 admin/owner를 visual badge로 표시 (필터 X)** — Why not: 사용자 발화 "강사 칩은 강사만"에 명백히 어긋남. badge로 구분해도 도메인 혼동 잔존.
- **Detail에 role 변경 + settings 동기화 양방향** — Why not: 한 entity의 상태가 두 화면에서 변경 가능하면 race + 사용자 혼동. settings를 SSOT로 단일화가 더 명확.
- **동명이인 부제를 tooltip으로 표시** — Why not: 모바일 미지원. inline subtitle이 universal.

## Verification

- 단위: `lib/__tests__/teacherPickerFilter.test.ts` (7건), `lib/__tests__/duplicateLabel.test.ts` (12건) 통과
- Layout 회귀: `StudentsPageLayout.test.tsx` (13건), `TeachersPageLayout.test.tsx` (10건) 통과
- Manual 검증 (사용자 본 시나리오):
  - TeacherDetailPanel 편집 → swatch 클릭 → 토스트 X → 취소 → 색상 원복
  - 편집 모드 폼 순서: 이름 / 이메일·전화 / 메모 / 색상 / 저장·취소
  - 보기 모드 → 역할 row + "역할 변경: Settings → 멤버" hint
  - 강사를 admin으로 승격(settings) → schedule modal pill에 부재
  - 기존 admin 배정 session 편집 → admin pill 표시 + "관리자" 부제
  - 동명이인 학생/강사 fixture → 모달 검색·픽커에 부제 표시
