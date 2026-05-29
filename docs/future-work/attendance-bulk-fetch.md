# 출결 bulk fetch — dot/모달 한 번에 로드 (follow-up)

> 발견: 2026-05-29, teacher-attendance unification 사용자 검증.
> 사용자 결정: 이번 PR 은 "빈 모달 즉시 학생 표시"(`attendanceMap ?? {}`)만 fix,
> dot progressive 로딩은 별도 follow-up.

## 증상

- `/schedule` 진입 시 SessionBlock 출결 dot 이 **하나씩 차례로** 뜬다.
- (해소됨) 블록 클릭 시 출결 모달이 빈 채로 떴다가 뒤늦게 채워짐 → 본 PR 에서 `?? {}`로 즉시 학생 pill 표시.

## 원인

- `GET /api/attendance` 가 **`sessionId` 필수** (단건). 한 화면의 N 세션 출결을 가져오려면
  N 번 개별 GET → 각각 `setAttendance` → N 번 re-render → dot 이 progressive 하게 나타남.
- `schedule/page.tsx` 의 bulk fetch effect 가 `Promise.all`로 병렬 호출하지만 state 갱신은
  여전히 호출별(useAttendance.fetchAttendance 내부).

## 제안 (별도 PR)

1. **bulk GET 엔드포인트** — `GET /api/attendance/range?userId=&date=&sessionIds=...` 또는
   `?weekStartDate=` → 해당 범위 전 세션 출결 1 응답.
   - 권한: member 는 본인 teacher 수업만 (assertAttendancePermission 를 per-session 또는
     teacher_id IN 본인 으로 일반화). owner/admin 은 academy 전체.
2. **useAttendance.fetchAttendanceBulk(sessionIds, date)** — 1 GET + **1 setAttendance**(merge)
   → dot 한 번에 표시.
3. `schedule/page.tsx` 의 per-session bulk effect 를 위 메서드 1 회 호출로 교체.

## 영향도 / 우선순위

- UX 개선 (dot 깜빡이며 순차 등장 → 한 번에). 기능 정확도는 현재도 정상.
- **medium** — 빈 모달(최악 증상)은 이미 해소. dot progressive 는 시각적 거슬림 수준.

## 트리거

- 세션 수가 많은 학원(시각적 거슬림 ↑)일 때, 또는 출결 성능/UX 개선 사이클에 함께.
