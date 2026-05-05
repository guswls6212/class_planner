# class-planner — User Acceptance Test (UAT) Checklist

**대상:** main 머지 전 종합 검증 + 분기당 1회 회귀 검증.
**소요:** Core 40분 / Extended 80분 / Full 120분.
**소유:** 1인 학원 운영자 (개발자 = 테스터).

> **이 파일은 template.** 실제 결과는 `tests/manual/runs/<DATE>-<COMMIT>-<MODE>.md` 사본에 기록 (§3 참조).
> 시나리오 본문 위 **Quick Setup** 박스의 콘솔 명령은 GUI 단계를 단축하기 위한 것 — `tests/manual/uat-helpers.js` 와 `tests/manual/seed-uat.js` 를 먼저 paste해두면 더 짧게 호출 가능.

---

## 사용법

### 1. 메타 기록

`scripts/uat-new.sh` 가 메타 두 줄(Build, 실행 일시)을 자동 채움. 나머지는 수동.

| 필드 | 값 |
|---|---|
| Build (commit hash) | `git rev-parse --short HEAD` |
| 실행 일시 | YYYY-MM-DD HH:MM |
| 실행자 | (이름) |
| 환경 | dev server (localhost:3000) / staging / prod |
| 뷰포트 | 데스크탑 1440×900 / 모바일 375×667 |

### 2. 실행 모드 선택

| 모드 | 시간 | 카테고리 | 언제 |
|---|---|---|---|
| **Core Path** | 40분 | 1, 2, 3, 5, 7, 12 (P0만) | 매 dev → main 머지 전 |
| **Extended** | 80분 | Core + 4, 6, 8, 9, 10 (P0+P1) | PR이 여러 영역 영향 시 |
| **Full Coverage** | 120분 | 전체 + 11, 13, Edge (P0+P1+P2) | 분기당 1회 + 큰 리팩터 후 |

### 3. 결과 기록 규칙

매 실행은 **본 파일 사본**(`tests/manual/runs/<DATE>-<COMMIT>-<MODE>.md`)에 기록. 본 파일은 template — 직접 수정 금지.

```bash
# 새 실행 인스턴스 생성 (메타 자동 채움)
bash scripts/uat-new.sh core   # 또는 extended / full

# 끝나면 commit
git add tests/manual/runs/<file>.md
git commit -m "chore(uat): 2026-05-05-1430 core run — 19/19 P0 pass"

# 추세 확인
bash scripts/uat-summary.sh
```

기록 표기:

- `[ ]` → 실행 전
- `[x]` → Pass
- `[!]` → Fail (note 필수: 어떤 단계에서 어떤 결과가 났는지)
- `[~]` → Skip (skip 사유 필수)

P0 19개 모두 Pass = main 머지 그린라이트.

자동 e2e 후보 시나리오는 `[auto-friendly]` 라벨 — 향후 별도 PR로 Playwright 마이그레이션 후 본 checklist에서 제외 예정.

### 4. 사전 준비 (Core Path 시작 전)

```
1. dev 서버 시작
   cd class-planner && npm run dev → http://localhost:3000

2. uat-helpers.js 콘솔 paste (1회)
   → window.uat 에 clearAll/forceFetch500/expireToken/inspect 등 노출

3. 깨끗한 상태 확보 (선택)
4. 기본 데이터 시드 (~30초)
```

**Quick Setup** (사전 준비 §3-§4):

```js
// 깨끗한 상태 (⚠️ localStorage/세션/쿠키 모두 삭제됨)
uat.clearAll();

// 시드 데이터 (학생 3명/과목 2개/강사 2명/세션 3개)
//   → tests/manual/seed-uat.js 전체 paste. 익명 모드 전용.
//   학생: 홍길동 / 김영수 / 박지수
//   과목: 수학 #FF0000 / 영어 #00FF00
//   강사: 김선생 #6366f1 / 이선생 #0891b2
//   세션: 월/수/금 09:00-10:00 — 수학 + 홍길동 + 김선생
```

---

## 1. Auth & 학원 셋업 (P0: 2 / 7) [40분 Core 포함]

### S-1.1 비로그인 → 로그인 리디렉트 [P0] [auto-friendly]
**Pre:** 비로그인 상태 (localStorage `supabase_user_id` 없음)

**Quick Setup**:
```js
uat.clearAll();              // 깨끗한 상태 보장
// 새로고침 후 콘솔에서 확인:
uat.isAnonymous();           // → true
```

**Steps:**
1. 직접 URL `http://localhost:3000/schedule` 접속
**Expected:**
- 익명 모드 시간표 화면 진입 (로그인 강제 X — 익명 사용 가능 정책)
- 사이드바 하단 "로그인" 링크 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-1.2 Google OAuth 로그인 [P1]
**Pre:** 비로그인 상태
**Steps:**
1. `/login` 접속
2. "Google로 로그인" 버튼 클릭
3. Google 계정 선택
**Expected:**
- OAuth 콜백 후 `/schedule` 또는 `/onboarding` 라우팅
- localStorage에 `supabase_user_id` 저장
- 사이드바 하단에 이메일 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-1.3 Kakao OAuth 로그인 [P1]
**Pre:** 비로그인 상태
**Steps:**
1. `/login` 접속
2. "Kakao로 로그인" 버튼 클릭
3. Kakao 계정 인증
**Expected:**
- OAuth 콜백 후 `/schedule` 또는 `/onboarding` 라우팅
- localStorage `supabase_user_id` 저장
**Result:** [ ] Pass [ ] Fail — note: ___

### S-1.4 익명 사용자 모드 [P1] [auto-friendly]
**Pre:** 비로그인 상태

**Quick Setup**:
```js
uat.clearAll();              // 깨끗한 상태
// 시나리오 실행 후 검증:
uat.inspect();               // 학생/과목/세션 카운트 확인
uat.countAPIcalls('/api/sessions') === 0;  // → true (서버 호출 0건)
```

**Steps:**
1. `/schedule`에서 학생/과목/수업 추가
2. 새로고침
**Expected:**
- 데이터 localStorage `classPlannerData:anonymous`에 유지
- 서버 호출 없음 (Network 탭에 `/api/sessions` POST 없음)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-1.5 첫 로그인 — 학원 자동 생성 [P0]
**Pre:** 신규 사용자 (이전 academy_members row 없음)
**Steps:**
1. OAuth 로그인 후 `/onboarding` 진입
2. 학원명 입력 (2자 이상)
3. "학원 생성" 클릭
**Expected:**
- `/schedule` 라우팅
- 사이드바 상단에 학원명 + Academy Switcher 표시
- API `/api/academies` POST 성공 (Network 확인)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-1.6 로그인 상태 → /login 접근 [P2]
**Pre:** 로그인 + active academy 상태
**Steps:**
1. `/login` 직접 URL 입력
**Expected:**
- 자동으로 `/schedule` 리다이렉트 (이미 로그인된 사용자)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-1.7 로그아웃 → 재로그인 [P2]
**Pre:** 로그인 상태

**Quick Setup** (대안 — 로그아웃 버튼 GUI 대신 토큰 강제 만료로 같은 효과 검증):
```js
uat.expireToken();           // sb-*-auth-token 키 + 쿠키 모두 삭제 + 새로고침
```

**Steps:**
1. 사이드바 하단 이메일 → "로그아웃"
2. 새로고침
3. 다시 OAuth 로그인
**Expected:**
- 로그아웃 후 익명 모드 (localStorage `supabase_user_id` + 3개 쿠키 정리됨)
- 재로그인 시 이전 데이터 복원
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 2. 학생 관리 (P0: 1 / 6) [Core 포함]

### S-2.1 학생 추가 [P0] [auto-friendly]
**Pre:** `/students` 진입

**Quick Setup** (인증 모드 API 호출 검증):
```js
const before = uat.countAPIcalls('/api/students');
// 학생 추가 후
const after  = uat.countAPIcalls('/api/students');
console.log('새 호출 수:', after - before);  // ≥1
```

**Steps:**
1. 입력란에 "테스트학생" 입력
2. Enter 또는 "추가" 클릭
**Expected:**
- 좌측 목록에 "테스트학생" 즉시 추가
- 입력란 비워짐
- 인증 사용자: Network에 `/api/students` POST 발사
**Result:** [ ] Pass [ ] Fail — note: ___

### S-2.2 학생 검색 [P1] [auto-friendly]
**Pre:** 학생 3명 이상 등록
**Steps:**
1. 검색 입력란에 "홍" 입력
**Expected:**
- "홍길동"만 표시, 나머지 학생 숨김
- 검색 클리어 시 전체 복원
**Result:** [ ] Pass [ ] Fail — note: ___

### S-2.3 학생 상세 보기 [P1] [auto-friendly]
**Pre:** 학생 1명 이상
**Steps:**
1. 학생 항목 클릭
**Expected:**
- 우측 패널에 이름/학년/학교/연락처/생년 표시
- 데스크탑: 분할 뷰 / 모바일: 우측 패널 단독 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-2.4 학생 정보 편집 [P1] [auto-friendly]
**Pre:** 학생 상세 패널 열림
**Steps:**
1. "편집" 버튼
2. 학년 "고1" 입력
3. "저장"
**Expected:**
- 즉시 패널에 반영
- 새로고침 후에도 유지
**Result:** [ ] Pass [ ] Fail — note: ___

### S-2.5 학생 삭제 [P1] [auto-friendly]
**Pre:** 학생 상세 패널 열림
**Steps:**
1. "삭제" 버튼
2. 확인 모달에서 "삭제"
**Expected:**
- 좌측 목록에서 즉시 제거
- 해당 학생 enrollment도 함께 정리 (시간표에서 학생 미표시)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-2.6 학생 0명 시 placeholder [P2]
**Pre:** 모든 학생 삭제 후
**Steps:**
1. `/students` 진입
**Expected:**
- "등록된 학생이 없습니다" 같은 placeholder 텍스트
- 우측 패널 빈 상태 안내
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 3. 과목 관리 (P0: 1 / 5) [Core 포함]

### S-3.1 과목 추가 [P0] [auto-friendly]
**Pre:** `/subjects` 진입
**Steps:**
1. 이름 "수학" + 색상 #FF0000 선택
2. "추가"
**Expected:**
- 목록에 즉시 추가, 선택한 색상으로 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-3.2 기본 색상 팔레트 [P2]
**Pre:** 과목 추가 화면
**Steps:**
1. 팔레트에서 9색 중 하나 클릭
**Expected:**
- 색상 입력란에 hex 자동 입력
- 미리보기 색상 변경
**Result:** [ ] Pass [ ] Fail — note: ___

### S-3.3 과목 편집 [P1] [auto-friendly]
**Pre:** 과목 1개 선택
**Steps:**
1. "편집" → 이름/색상 수정 → 저장
**Expected:**
- 시간표 모든 해당 세션의 색상도 즉시 변경 (colorBy=과목 모드)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-3.4 과목 삭제 [P1] [auto-friendly]
**Pre:** 과목에 연결된 세션 있음
**Steps:**
1. 과목 삭제
**Expected:**
- 해당 세션 처리 정책 확인 (앱이 제거하는지, "미지정"으로 표시하는지)
- 데이터 일관성 유지
**Result:** [ ] Pass [ ] Fail — note: ___

### S-3.5 색상 hex 직접 입력 [P2]
**Pre:** 과목 추가 모달
**Steps:**
1. 색상 입력란에 `#3B82F6` 직접 입력
**Expected:**
- 유효 hex: 미리보기 반영
- 잘못된 형식: 에러 또는 무시
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 4. 강사 관리 + 담당 과목 (P0: 1 / 8)

### S-4.1 강사 추가 [P0]
**Pre:** `/teachers` 진입
**Steps:**
1. "강사 추가" → 이름 "김선생" 입력
2. "추가"
**Expected:**
- 목록에 추가
- 자동 색상 할당 (DEFAULT_TEACHER_COLORS 8색 순환)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.2 색상 자동 할당 순환 [P1]
**Pre:** 강사 0명
**Steps:**
1. 강사 9명 연속 추가
**Expected:**
- 1~8번째: DEFAULT_TEACHER_COLORS 순서대로
- 9번째: 다시 1번 색상으로 wrap
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.3 강사 색상 커스텀 [P2]
**Pre:** 강사 1명 등록
**Steps:**
1. 강사 편집 → 팔레트 또는 hex 직접 입력
**Expected:**
- 시간표에서 colorBy=강사 모드로 보면 색상 변경 즉시 반영
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.4 강사 정보 편집 [P1]
**Pre:** 강사 1명
**Steps:**
1. 이름/연락처/메모 편집 → 저장
**Expected:**
- 시간표 SessionCard 강사명 즉시 갱신
- 새로고침 후 유지
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.5 강사 삭제 [P1]
**Pre:** 강사 1명 + 그 강사 배정 세션 1개
**Steps:**
1. 강사 삭제
**Expected:**
- 세션의 teacherId가 null로 정리됨
- SessionCard에 "강사 미배정" 또는 빈 상태 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.6 담당 과목 M:N 연결 [P1]
**Pre:** 강사 1명 + 과목 2개
**Steps:**
1. 강사 상세 → "담당 과목" 섹션 → 과목 2개 모두 체크
**Expected:**
- TeacherDetailPanel에 칩 형태로 2개 과목 표시
- 시간표 수업 추가 시 강사 선택하면 해당 과목만 후보로 필터링 (정책 확인)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.7 주간 수업 카운트 [P2]
**Pre:** 강사 1명 + 그 강사 주간 3회 배정
**Steps:**
1. 강사 상세 패널
**Expected:**
- "주간 3회" 메타 정확
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.8 TeacherStatusPill 6-state 표시 [P2]
**Pre:** 다양한 상태 강사 (active/invite_pending/invite_expired/share_only/share_expired/inactive)
**Steps:**
1. 강사 목록의 각 상태 칩 확인
**Expected:**
- 색상/아이콘이 상태마다 구분되게 표시
- 마우스 hover tooltip으로 상태 설명
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 5. 시간표 — 수업 추가/편집/삭제 (P0: 4 / 12) [Core 포함]

### S-5.1 FAB 클릭 → 모달 열림 [P0] [auto-friendly]
**Pre:** `/schedule`
**Steps:**
1. 우측 하단 FAB ("+") 클릭
**Expected:**
- GroupSessionModal 3-step Stepper 열림 (Step 1: 학생)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.2 학생 선택 (Step 1) [P0] [auto-friendly]
**Pre:** 모달 Step 1
**Steps:**
1. 학생 이름 검색 입력
2. 후보에서 클릭 → chip 추가
3. 여러 학생 추가 가능
4. "다음" 클릭
**Expected:**
- chip으로 선택 상태 표시
- chip "x" 클릭 시 해제
- "다음" 버튼은 1명 이상 선택 시 활성화
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.3 새 학생 on-the-fly [P0]
**Pre:** Step 1, 미등록 이름 입력
**Steps:**
1. 입력란에 "신규학생" (미등록 이름)
2. CTA "+ '신규학생' 새 학생으로 추가" 표시
3. CTA 클릭
**Expected:**
- 학생 즉시 생성 + 선택된 chip으로 추가
- 학생 목록에도 영구 등록
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.4 과목/강사/시간 선택 (Step 2) [P0] [auto-friendly]
**Pre:** Step 2
**Steps:**
1. 과목 select → "수학"
2. 강사 select → "김선생"
3. 요일 → "월"
4. 시간 → "09:00 ~ 10:00"
5. "다음"
**Expected:**
- 모든 입력 보존 + Step 3 진입
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.5 시간 range 검증 [P1]
**Pre:** Step 2 시간 입력
**Steps:**
1. 시작시간 09:00, 종료 08:00 (역순)
**Expected:**
- 에러 메시지 또는 자동 보정
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.6 확인 + 추가 (Step 3) [P0] [auto-friendly]
**Pre:** Step 3 요약 카드
**Steps:**
1. 요약 확인 (학생/과목/강사/시간)
2. "수업 추가" 클릭
**Expected:**
- 시간표 해당 셀에 SessionCard 즉시 생성
- 모달 닫힘
- 인증 사용자: `/api/sessions` POST + `/api/enrollments` POST
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.7 시간표에 블록 표시 [P0]
**Pre:** S-5.6 직후
**Steps:**
1. 시간표 해당 시간대 확인
**Expected:**
- 색상: colorBy 모드에 맞게 (과목/학생/강사 색상)
- 텍스트: 과목명 + 시간 + 학생 (최대 8명, 초과 시 "외 N명")
- 강사명 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.8 세션 편집 모달 열기 [P1]
**Pre:** 기존 세션 1개
**Steps:**
1. SessionCard 클릭
**Expected:**
- EditSessionModal 열림 (학생/과목/강사/시간 prefill)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.9 세션 수정 저장 [P1]
**Pre:** EditSessionModal 열림
**Steps:**
1. 시간 09:00 → 10:00으로 변경
2. "저장"
**Expected:**
- 시간표 즉시 새 위치로 이동
- 새로고침 후 유지
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.10 세션 삭제 [P1] [auto-friendly]
**Pre:** SessionCard 우측 메뉴
**Steps:**
1. "..." → "삭제"
2. 확인 모달
**Expected:**
- 시간표에서 즉시 제거
- 인증: `/api/sessions/:id` DELETE
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.11 같은 시간대 중복 수업 [P1]
**Pre:** 09:00-10:00에 수학(홍길동)
**Steps:**
1. 같은 09:00-10:00에 영어(김영수) 추가
**Expected:**
- 두 세션이 lane 분할되어 나란히 표시
- 텍스트 잘림 없이 가독성 유지
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.12 다중 선택 → 일괄 삭제 [P2]
**Pre:** 세션 3개
**Steps:**
1. Cmd+클릭 (mac) / Ctrl+클릭 (win)으로 3개 선택
2. "삭제" 키 또는 일괄 삭제 메뉴
**Expected:**
- 선택 표시 (테두리/하이라이트)
- 일괄 삭제 모달 → 확인 → 모두 제거
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 6. 시간표 — 드래그/충돌/멀티선택 (P0: 2 / 10)

### S-6.1 드래그로 시간 이동 [P0]
**Pre:** 세션 1개 (월 09:00-10:00)
**Steps:**
1. SessionCard drag handle을 월 11:00 셀로 드래그
2. drop
**Expected:**
- 세션이 월 11:00-12:00로 즉시 이동
- 새로고침 후 유지
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.2 드래그 후 동기화 [P0]
**Pre:** 인증 모드
**Steps:**
1. S-6.1 실행
**Expected:**
- Network 탭에 `/api/sessions/:id` PUT 호출 발사
- response 200/201
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.3 드래그 중 미리보기 [P1]
**Pre:** 드래그 진행 중
**Steps:**
1. 드래그 시작 → 마우스 이동
**Expected:**
- 드롭 가능 위치에 반투명 preview 표시
- 원본 SessionCard는 살짝 흐려짐(opacity)
- preview는 pointer-events: none (클릭 안 됨)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.4 드래그 취소 (Escape) [P2]
**Pre:** 드래그 중
**Steps:**
1. 드래그 도중 Escape 키
**Expected:**
- 원래 위치로 돌아감
- API 호출 없음
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.5 Cmd+드래그 (복사) [P1]
**Pre:** 세션 1개
**Steps:**
1. Cmd 누른 채 SessionCard 드래그 → 다른 시간대 drop
**Expected:**
- 원본 그대로 + 사본 새로 생성 (별도 ID)
- 둘 다 시간표에 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.6 드래그 충돌 처리 [P2]
**Pre:** 09:00-10:00에 A세션, 10:00-11:00에 B세션
**Steps:**
1. A를 드래그해서 10:00 시작으로 이동
**Expected:**
- B와 시간 겹침 → lane 자동 분할 또는 충돌 모달 표시
- 데이터 일관성 유지 (둘 다 사라지지 않음)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.7 다중 선택 (Cmd+클릭) [P1]
**Pre:** 세션 3개
**Steps:**
1. 첫 세션 클릭 → Cmd+다른 세션 클릭
**Expected:**
- 선택된 세션에 시각적 표시 (테두리/하이라이트)
- 동시에 여러 개 선택 상태
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.8 다중 선택 드래그 [P2]
**Pre:** S-6.7 후 (3개 선택 상태)
**Steps:**
1. 선택된 세션 중 하나를 다른 시간대로 드래그
**Expected:**
- 3개 모두 같은 offset으로 함께 이동
- 충돌 발생 시 처리 정책 확인
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.9 다중 선택 취소 [P2]
**Pre:** 세션 다중 선택 상태
**Steps:**
1. 시간표 빈 영역 클릭
**Expected:**
- 모든 선택 해제
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.10 Ghost cleanup [P2]
**Pre:** 드래그 진행 중
**Steps:**
1. 드래그 시작 → 빠르게 다른 시간대 drop
**Expected:**
- drop 후 ghost(임시 placeholder)가 사라지고 정확한 위치에 SessionCard 1개만 표시
- 잔상/중복 카드 없음
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 7. 템플릿 (P0: 3 / 8) [⚠️ PR #211 회귀 집중]

> **자동 회귀 가드:**
> - `src/app/schedule/_utils/__tests__/buildTemplateData.test.ts` (10 unit)
> - `tests/e2e/schedule-templates.spec.ts` (2 e2e)
> - `src/__tests__/fixtures/template.fixture.ts` (Required<Omit<>> 타입 강제)

### S-7.1 템플릿 저장 [P0] ⚠️
**Pre:** 시간표에 강사 포함 수업 13개

**Quick Setup** (POST 호출 횟수 검증):
```js
const before = uat.countAPIcalls('/api/templates');
// 시나리오 후
console.log('새 호출:', uat.countAPIcalls('/api/templates') - before);  // 1
```

**Steps:**
1. ScheduleActionBar "템플릿" 드롭다운
2. "현재 주를 템플릿으로 저장" 클릭
3. 모달에 이름 "주간 기본" 입력
4. "저장"
**Expected:**
- 모달에 "13개 수업이 저장됩니다" 텍스트 표시 (세션 X)
- success 토스트 "템플릿이 저장되었습니다"
- API `/api/templates` POST 200/201
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.2 저장 실패 시 에러 토스트 [P0] ⚠️
**Pre:** POST /api/templates를 500으로 강제 실패

**Quick Setup** (DevTools Network override 대안 — 콘솔 1줄):
```js
// 시나리오 시작 직전 호출 — 매칭되는 fetch에 500 응답
const restore = uat.forceFetch500('/api/templates');
// S-7.1 단계 수행 후 검증 끝나면 복구:
restore();
```

**Steps:**
1. S-7.1 시도
**Expected:**
- error 토스트 "템플릿 저장에 실패했습니다. 잠시 후 다시 시도해주세요."
- 모달은 닫히지 않음 (재시도 가능)
- success 토스트는 절대 뜨지 않음
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.3 저장된 템플릿 메뉴 표시 [P1] ⚠️
**Pre:** S-7.1 성공 직후
**Steps:**
1. 페이지 새로고침
2. ScheduleActionBar "템플릿" 드롭다운 열기
**Expected:**
- "이 주에 작업" 섹션의 "템플릿 적용하기"가 활성화 (회색 X)
- "템플릿 자체" 섹션의 "미리보기"가 활성화
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.4 템플릿 적용 [P0] ⚠️
**Pre:** 템플릿 1개 저장 + 다른 주 빈 상태
**Steps:**
1. 다음 주로 이동 (next week 화살표)
2. 템플릿 메뉴 → "템플릿 적용하기"
3. 확인 모달 → "적용"
**Expected:**
- 다음 주에 13개 수업 모두 생성
- success 토스트 "13개 수업이 템플릿으로 교체되었습니다"
- 각 세션에 강사 정보 유지 (강사명 표시)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.5 Round-trip 강사 정보 [P0] ⚠️
**Pre:** S-7.4 직후
**Steps:**
1. 새로고침
2. 적용된 주의 수업들 확인
**Expected:**
- 모든 세션에 강사명 표시 ("강사 미배정" 0개)
- colorBy=강사 모드로 토글하면 강사 색상 정확
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.6 Round-trip room/yPosition [P1] ⚠️
**Pre:** room 정보 있는 세션 포함된 시간표 → 템플릿 저장 → 다른 주에 적용
**Steps:**
1. 적용된 세션의 room 정보 확인
**Expected:**
- room 값 보존됨 (저장 → 적용 round-trip 손실 X)
- yPosition도 동일하게 보존 (lane 위치)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.7 템플릿 미리보기 [P2] ⚠️
**Pre:** 템플릿 저장된 상태
**Steps:**
1. 템플릿 메뉴 → "미리보기"
**Expected:**
- TemplatePreviewModal 열림
- 저장된 13개 수업 시각화 (실제 적용 X)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.8 학생/과목 매칭 실패 시 경고 [P2] ⚠️
**Pre:** 템플릿 저장 → 학생 1명 삭제 → 다른 주에 적용
**Steps:**
1. 템플릿 적용 시도
**Expected:**
- 매칭 실패 학생/과목/강사가 토스트 메시지에 명시 (e.g. "매칭 실패: 학생 '홍길동', 과목 '수학' 외")
- 매칭 성공한 세션만 생성
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 8. PDF Export (P0: 1 / 7)

### S-8.1 PDF 다운로드 모달 [P0]
**Pre:** `/schedule` 인증 모드
**Steps:**
1. ScheduleActionBar "주간 시간표 PDF 다운로드" 버튼
**Expected:**
- PdfExportRangeModal 열림 (또는 즉시 다운로드 시작)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.2 뷰 모드별 라벨 [P2]
**Pre:** 일별/주간/월별 각 뷰
**Steps:**
1. 각 뷰에서 PDF 버튼 라벨 확인
**Expected:**
- "일별 시간표 PDF" / "주간 시간표 PDF" / "월별 시간표 PDF" 각각 정확
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.3 PDF 콘텐츠 검증 [P1]
**Pre:** PDF 다운로드 완료
**Steps:**
1. 다운로드된 PDF 열기
**Expected:**
- 학생명 모두 표시 (생략 없이 또는 "외 N명")
- 과목/시간/요일 정확
- 강사명 표시 (Phase 6에서 추가됨)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.4 색상 정확도 [P1]
**Pre:** PDF 열기
**Steps:**
1. 화면 시간표 색상 vs PDF 색상 비교
**Expected:**
- tintFromHex 적용된 색상이 화면과 동일
- 한글 폰트 깨짐 없음 (Pretendard Subset)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.5 인쇄 시 레이아웃 [P1]
**Pre:** PDF 인쇄 (실제 또는 미리보기)
**Steps:**
1. A4 인쇄 미리보기
**Expected:**
- 시간표가 한 페이지에 깔끔히 배치
- 텍스트 잘림 / 겹침 없음
- 여백 적절
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.6 강사별 PDF [P1]
**Pre:** 강사 2명 + 각 세션
**Steps:**
1. PdfExportRangeModal → "강사별 분리"
2. 강사 선택 또는 전체
3. 다운로드
**Expected:**
- 선택한 강사의 세션만 포함된 PDF
- 또는 강사 1인당 1페이지로 분리
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.7 날짜 범위 선택 [P2]
**Pre:** 월별 PDF
**Steps:**
1. PdfExportRangeModal → 시작일/종료일 입력
**Expected:**
- 해당 범위만 포함된 PDF
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 9. 공유 링크 + 접속 코드 (P0: 2 / 6)

### S-9.1 공유 링크 생성 [P0]
**Pre:** `/settings` 진입
**Steps:**
1. "시간표 공유" 섹션 펼치기
2. "공유 링크 생성" 클릭
**Expected:**
- 모달에 토큰 URL `https://.../share/{token}` 표시
- 자동 클립보드 복사 + "복사됨" 피드백
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.2 공개 링크 접근 (비로그인) [P0]
**Pre:** 다른 브라우저 또는 시크릿 창

**Quick Setup** (터미널 — Chrome 시크릿 새 창 자동 열기):
```bash
# {token} 자리에 S-9.1에서 받은 토큰 붙여넣기
open -na "Google Chrome" --args --incognito --new-window "http://localhost:3000/share/{token}"
```

**Steps:**
1. `/share/{token}` 직접 접근
**Expected:**
- 시간표 읽기 전용 표시
- 편집/삭제 버튼 없음
- 학생/과목/강사 데이터 정확
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.3 학부모 접속 코드 생성 [P1]
**Pre:** `/settings`
**Steps:**
1. "학부모 접속 코드" → "코드 생성"
**Expected:**
- 6자리 코드 표시 (혼동 문자 L 제외)
- 복사 버튼
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.4 코드로 접근 [P1]
**Pre:** S-9.3 코드 보유
**Steps:**
1. `/academy/{slug}` 또는 `/academy/{uuid}` 접속
2. 코드 입력
**Expected:**
- 인증 후 share token 반환 → `/share/{token}` 라우팅
- 시간표 읽기 전용 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.5 코드 만료 [P2]
**Pre:** 새 코드 발급
**Steps:**
1. 이전 코드로 접근 시도
**Expected:**
- 401 또는 에러 페이지 ("만료된 코드입니다")
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.6 IP rate limit / lockout [P2]
**Pre:** 코드 입력 화면
**Steps:**
1. 잘못된 코드 5회 연속 입력
**Expected:**
- lockout 트리거 ("잠시 후 다시 시도하세요")
- 일정 시간 후 재시도 가능
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 10. 다중 Academy + 권한 (P0: 0 / 7)

### S-10.1 Academy 전환 [P1]
**Pre:** 사용자가 academy 2개 멤버
**Steps:**
1. 사이드바 상단 학원명 클릭 → Academy Switcher
2. 다른 학원 선택
**Expected:**
- localStorage `active_academy_id_{userId}` 변경
- 시간표/학생/과목 데이터가 해당 academy로 전환
**Result:** [ ] Pass [ ] Fail — note: ___

### S-10.2 Active Academy 쿠키 저장 [P1]
**Pre:** S-10.1 후
**Steps:**
1. 새로고침
**Expected:**
- 마지막 선택한 academy로 자동 진입
- Cookie `active_academy_id` 정확
**Result:** [ ] Pass [ ] Fail — note: ___

### S-10.3 Owner vs Admin vs Member 권한 [P1]
**Pre:** 각 role별 사용자
**Steps:**
1. 각 role로 로그인 후 `/settings` 멤버 목록 확인
**Expected:**
- Owner/Admin: 멤버 추가/삭제 가능
- Member: 자기 정보만 보기, 수정 권한 없음
**Result:** [ ] Pass [ ] Fail — note: ___

### S-10.4 Member RBAC 라우트 가드 [P1]
**Pre:** member 역할 사용자
**Steps:**
1. `/students` 직접 URL 접근
**Expected:**
- middleware route guard → `/schedule` 또는 `/teacher-schedule`로 리다이렉트
- "권한 없음" 메시지 또는 silent redirect
**Result:** [ ] Pass [ ] Fail — note: ___

### S-10.5 Member UI 필터링 [P2]
**Pre:** member 역할
**Steps:**
1. ScheduleActionBar 확인
**Expected:**
- 공유/PDF/템플릿 버튼 숨김 또는 비활성화
- 사이드바도 학생/과목 메뉴 숨김
**Result:** [ ] Pass [ ] Fail — note: ___

### S-10.6 초대 토큰 발송 (owner/admin만) [P1]
**Pre:** owner 역할
**Steps:**
1. `/settings` → "강사 초대" → 이메일 입력 + 역할 선택
2. "초대 발송"
**Expected:**
- 초대 토큰 생성 (7일 만료)
- 토큰 URL 생성 + 복사
**Result:** [ ] Pass [ ] Fail — note: ___

### S-10.7 초대 수락 4-state [P1]
**Pre:** S-10.6 토큰
**Steps:**
1. `/invite/{token}` 접근 — 4가지 상태별
   - (a) 비로그인 → 로그인 유도
   - (b) 로그인 + 이메일 일치 → 수락
   - (c) 로그인 + 이메일 불일치 → 에러
   - (d) 이미 멤버 → 안내
**Expected:**
- 각 상태 분기 정확
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 11. 모바일 뷰포트 (375×667) (P0: 0 / 7)

> **테스트 방법:** Chrome DevTools → Toggle device toolbar → iPhone SE (375×667) 또는 Playwright `--viewport=375,667`.
> 단축키: DevTools 열린 상태에서 `Cmd+Shift+M` (macOS) / `Ctrl+Shift+M` (Win/Linux) → device toolbar 토글.

### S-11.1 BottomTabBar 표시 [P1]
**Pre:** 모바일 뷰포트
**Steps:**
1. 임의 페이지 진입
**Expected:**
- 하단 고정 BottomTabBar에 4개 탭 (시간표/학생/과목/설정 또는 비슷)
- 데스크탑 사이드바 숨김
**Result:** [ ] Pass [ ] Fail — note: ___

### S-11.2 FAB 위치 [P2]
**Pre:** 모바일 `/schedule`
**Steps:**
1. FAB 위치 확인
**Expected:**
- BottomTabBar 위에 FAB 배치
- BottomTabBar 가리지 않음
**Result:** [ ] Pass [ ] Fail — note: ___

### S-11.3 모달 → BottomSheet [P1]
**Pre:** 모바일에서 GroupSessionModal 열기
**Steps:**
1. FAB 클릭
**Expected:**
- 풀스크린 또는 슬라이드업 BottomSheet 형태 (데스크탑 floating modal과 다름)
- 제스처로 닫기 가능 (옵션)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-11.4 시간표 그리드 스크롤 [P2]
**Pre:** 모바일 주간 뷰
**Steps:**
1. 좌우/상하 스크롤
**Expected:**
- 가로/세로 스크롤 부드러움
- 헤더(요일/시간)가 sticky로 고정 (옵션)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-11.5 터치 타겟 44px [P2]
**Pre:** 모바일
**Steps:**
1. 버튼/입력 요소 시각 확인
**Expected:**
- 모든 인터랙티브 요소 최소 44×44px
- 인접 버튼 사이 8px 이상 여백
**Result:** [ ] Pass [ ] Fail — note: ___

### S-11.6 학생 관리 — 탭 전환 [P2]
**Pre:** 모바일 `/students`
**Steps:**
1. 학생 목록 표시 → 항목 탭
**Expected:**
- 데스크탑 분할 뷰 X
- 목록 → 상세 화면 슬라이드 전환
- 뒤로가기 버튼 존재
**Result:** [ ] Pass [ ] Fail — note: ___

### S-11.7 공유 → 드로어 [P2]
**Pre:** 모바일 `/settings` 공유
**Steps:**
1. 공유 링크 생성 화면 진입
**Expected:**
- 모달 X, 슬라이드업 드로어 형태
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 12. 새로고침 / 네트워크 (P0: 2 / 5) [Core 포함]

### S-12.1 새로고침 후 데이터 유지 [P0] [auto-friendly]
**Pre:** 시간표 + 학생/과목/세션 입력 완료
**Steps:**
1. F5 새로고침
**Expected:**
- 모든 데이터 유지 (localStorage SSOT)
- 인증: 서버에서 fetch한 데이터와 일치
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.2 새로고침 후 강사 정보 유지 [P0] ⚠️ [auto-friendly]
**Pre:** 강사 배정된 세션
**Steps:**
1. 새로고침 후 SessionCard 강사명 확인
**Expected:**
- 모든 세션에 강사명 정확
- "강사 미배정" 0개 (의도적으로 미배정한 세션 제외)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.3 로그인 후 새로고침 [P1]
**Pre:** 익명 모드에서 데이터 입력 → 로그인
**Steps:**
1. 로그인 직후 새로고침
**Expected:**
- 익명 데이터가 user 키로 마이그레이션 (또는 무중단)
- 서버 데이터 + localStorage 일치
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.4 오프라인 모드 [P2]
**Pre:** DevTools Network → Offline
**Steps:**
1. 시간표 조회/편집/추가 시도
**Expected:**
- localStorage만으로 정상 동작 (Local-First)
- 온라인 복구 시 자동 sync (POST/PUT 큐 발사)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.5 API 401 처리 [P2]
**Pre:** 토큰 만료 (Supabase session expire)

**Quick Setup** (토큰 강제 만료):
```js
uat.expireToken();           // sb-*-auth-token 키 + 쿠키 모두 삭제 + 새로고침
// 새로고침 후 어떤 API 호출이라도 401 또는 라우트 가드 트리거 expected
```

**Steps:**
1. 어떤 API 호출이라도 401
**Expected:**
- 자동 로그아웃 또는 로그인 화면 리다이렉트
- 사용자에게 명확한 안내
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 13. 색상 / 시각 (P0: 0 / 5)

### S-13.1 ColorBy = 과목 [P1]
**Pre:** SegmentedButton "색상 기준"
**Steps:**
1. "과목" 선택
**Expected:**
- 모든 SessionCard 배경색 = 해당 과목 색상
- 학생/강사 칩 필터 바 숨김
**Result:** [ ] Pass [ ] Fail — note: ___

### S-13.2 ColorBy = 학생 [P1]
**Pre:** "학생" 선택
**Steps:**
1. StudentFilterChipBar 표시 확인
2. 학생 1명 선택
**Expected:**
- 선택한 학생의 세션만 컬러 highlight
- 미선택 세션은 흐리게
- 색상은 학생 이름 해시 기반 (Phase 6 정책)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-13.3 ColorBy = 강사 [P2]
**Pre:** "강사" 선택
**Steps:**
1. TeacherFilterChipBar 표시
2. 강사 1명 선택
**Expected:**
- 선택한 강사의 세션 색상 = 강사 색상
- 헤더에 "강사 N명" 배지 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-13.4 현재 시각 타임라인 [P1]
**Pre:** 주간 뷰 + 오늘 컬럼
**Steps:**
1. 현재 시각 위치 확인
**Expected:**
- amber 가로선 현재 시각 위치에 그려짐
- "HH:MM" pill 표시
- 분 경계에 동기화 (1분마다 갱신 또는 폴링)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-13.5 오늘 컬럼 강조 [P2]
**Pre:** 주간 뷰
**Steps:**
1. 오늘 요일 컬럼 시각 확인
**Expected:**
- 컬럼 배경 amber tint
- 요일 헤더에 원형 amber 배지 + 날짜 숫자
**Result:** [ ] Pass [ ] Fail — note: ___

---

## Edge Cases (P0: 0 / 10)

### E-1. 학생 0명 + 수업 추가 시도 [P2]
**Pre:** 모든 학생 삭제
**Steps:** GroupSessionModal Step 1
**Expected:** "새 학생 추가" CTA만 활성화, 검색 결과 빈

### E-2. 과목 0개 + 수업 추가 [P2]
**Pre:** 모든 과목 삭제
**Steps:** Step 2 과목 select
**Expected:** disabled 또는 "먼저 과목을 추가하세요" placeholder

### E-3. 같은 시간대 4개+ 겹침 [P1]
**Pre:** 09:00-10:00에 4개 세션
**Steps:** 시간표 확인
**Expected:** 3개 표시 + "+1" pill (클릭 시 popover로 전체 표시)

### E-4. 학원명 2자 미만 온보딩 [P2]
**Pre:** /onboarding
**Steps:** 학원명 "A" (1자) 입력 후 제출
**Expected:** 유효성 에러 → 재입력 유도

### E-5. 강사 미배정 세션 [P2]
**Pre:** GroupSessionModal에서 강사 선택 안 함
**Steps:** 수업 추가
**Expected:** SessionCard에 "강사 미배정" 또는 강사 슬롯 빈 상태 표시

### E-6. 템플릿 적용 후 과목 삭제 [P2]
**Pre:** 템플릿 적용 → 그 안의 과목 삭제
**Steps:** 시간표 확인
**Expected:** 해당 세션은 "미지정" 표시 또는 자동 정리

### E-7. 빠른 다중 API 호출 [P2]
**Pre:** 인증 모드
**Steps:** 빠르게 연속으로 세션 5개 드래그
**Expected:** 모든 PUT 호출 발사 + 응답 처리, 데이터 일관성 유지

### E-8. ColorBy=학생 + 학생 미선택 [P2]
**Pre:** "학생" 모드 + 칩 0개 선택
**Steps:** SessionCard 색상 확인
**Expected:** 폴백으로 과목 색상 사용 (회색 X)

### E-9. 만료 공유 토큰 접근 [P2]
**Pre:** 만료된 share token URL
**Steps:** `/share/{expired-token}` 접근
**Expected:** 403 또는 "만료된 링크입니다" 페이지

### E-10. 멀티탭 동시 편집 [P2]
**Pre:** 같은 사용자, 두 탭에서 /schedule 열기
**Steps:**
1. 탭 A: 수업 추가
2. 탭 B: 새로고침 또는 자동 polling
**Expected:**
- 탭 B에 변경사항 반영 (broadcast 또는 30초 polling 통해)
- 토스트 "다른 탭에서 변경사항 발생" (또는 silent merge)

---

## 회귀 가드 cross-reference (PR #211 — Templates)

**자동 테스트:**
- `src/app/schedule/_utils/__tests__/buildTemplateData.test.ts` — 10 unit tests (teacherId/null/매칭실패/room/yPosition/multi sessions)
- `tests/e2e/schedule-templates.spec.ts` — 2 e2e (POST body 직렬화 + 500 응답 토스트)
- `src/__tests__/fixtures/template.fixture.ts` — Required<Omit<>> 트릭으로 누락 시 컴파일 에러
- `src/hooks/__tests__/useTemplates.test.ts` — 네트워크 오류 시 false/null 리턴 검증

**수동 시나리오:** S-7.1 ~ S-7.8 (8개 모두 ⚠️ 표시)

**Main 머지 조건:** 본 8개 시나리오 + 자동 테스트 모두 Pass.

---

## 발견 이슈 처리

UAT 중 Fail 발생 시:
1. **Critical (P0 Fail):** 즉시 fix 후 새 PR. main 머지 보류.
2. **High (P1 Fail):** GitHub Issue 등록 + 우선순위 검토 + 차기 PR.
3. **Medium (P2 Fail):** Issue 등록만, 일정 여유에 따라 fix.

Issue 등록 형식:
- Title: `[UAT Fail] S-X.Y 시나리오 제목`
- Body: 시나리오 전문 + Actual result + 환경 정보 (build, viewport, browser)

---

## 변경 이력

- 2026-05-04: 초기 작성 (73 시나리오 + 10 edge case). PR #211 회귀 가드 cross-reference 포함.
- 2026-05-05: Quick Setup 콘솔 명령 박스 + `tests/manual/seed-uat.js` / `uat-helpers.js` 신설. `runs/` 디렉터리로 결과 기록 분리 (template은 본 파일 유지). `[auto-friendly]` 라벨로 향후 e2e 마이그레이션 후보 표시.
