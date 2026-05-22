# ADR-021: PDF 인쇄 Spec — 정보 우선순위 + 출력 범위 자동

**Status:** Accepted
**Date:** 2026-05-21
**Deciders:** HYUNJIN

## Context

PR #425 (UAT 2026-05-21) 에서 PDF 다운로드 button 라벨/결과 불일치 해소 + 필터 hidden 인쇄 적용. 사용자 검증 결과 추가 문제:

1. **1h 수업 학생 truncate 심각** — block height 부족
2. **출력 범위 9-24시 강제** — 18시 이후 빈 공간 큼
3. **5-stack 같은 겹침** — column 폭 1/5 → 잘림
4. **강사 이름 위치** — subject 아래라 시선 흐름 안 좋음
5. **시간 표시** — `HH:MM~HH:MM` (시작만 + 물결) → `HH:MM - HH:MM` 둘 다 명시

ADR-003 (PDF 디자인 토큰 — light pastel + 좌측 stripe + 어두운 텍스트) 의 시각 spec 은 유지. 본 ADR 은 **block 내용 spec** + **출력 범위 정책** 명문화.

## Decisions

### D1. Block 내용 정보 우선순위

block 의 cell.height (mm) 기준 단계 노출:

| height | 표시 내용 |
|---|---|
| 항상 | subject 좌상단 + teacher 우상단 (right-align) |
| `>= 6mm` (30분+) | + `시작 - 마침` 시간 (둘 다, 스페이스 포함) |
| `>= 12mm` (1h+) | + 학생 1줄 truncate (... 처리) |
| `>= 18mm` (1.5h+) | + 학생 wrap 최대 2줄 |

근거:
- 강사 우상단 = subject 와 같은 y 라 시선 1줄에 핵심 정보 (과목 + 담당). 종이 인쇄 시 한눈 인지
- 30분 미만 cell 은 시간 표시 공간 부족 → 제목+강사만
- 학생 1.5h+ wrap = 다인원 수업의 학생 명단 풍부 표현

### D2. 출력 범위 자동

`startHour` / `endHour` 결정 정책:

```
autoStartHour = max(0, min(userTimeRange.start, floor(dataMin / 60)))
autoEndHour   = min(24, max(userTimeRange.end, ceil(dataMax / 60)))
```

- 사용자 timeRange 설정 + 데이터 실제 분포 둘 다 고려 → **union**
- 데이터가 사용자 범위 안에 있으면 사용자 범위 그대로
- 데이터가 사용자 범위 밖이면 자동 확장 (잘림 방지)
- sessions empty 시 사용자 timeRange fallback

기존 단순 `timeRange.startHour ~ timeRange.endHour + 1` 정책의 빈 공간 큰 문제 해소.

### D3. 시간 표시 포맷

`HH:MM~HH:MM` (옛) → `HH:MM - HH:MM` (스페이스 + 하이픈).

근거: 두 시각이 둘 다 명시되어야 시간 인지 명확 (옛 포맷도 둘 다였지만 `~` 가 한국 문맥에서 "약" 의미 가능 — `-` 가 "from-to" 의미 더 명확).

### D4. 강사별 / 학생별 페이지 (PR #428)

본 ADR scope: PDF rendering 만. dropdown 의 "강사별 / 학생별" 옵션은 **PR #428** 에서 PdfExportRangeModal 통합으로 활성화:

- `PDFDownloadButton` 의 disabled placeholder → `onPerTeacher` / `onPerStudent` props 전달 시 활성. 미전달 시 placeholder 유지 (backward compat — teacher-schedule 등).
- `PdfExportRangeModal` 에 `initialScope` prop 추가 — dropdown 에서 진입 시 mode pre-set (`per-teacher` / `per-student`).
- 학생별 mode 신설: `Scope` union 확장 + `selectedStudentIds` chip selector (강사별 mirror). caller 가 학생별 1회씩 `renderSchedulePdf({ filterStudentId, title, perStudent: true })` 호출 — 학생당 1 PDF 파일.
- **페이지 폭발 가드**: 학생 30명 초과 선택 + 출력 클릭 시 `window.confirm` 확인 (학원당 100명+ 가능 — 한 번에 100 PDF 다운로드 회피).
- `PdfRenderOptions.perStudent?: boolean` 추가 — 푸터 메타 "분할: 학생별" 표기 (rendering 자체는 `filterStudentId` 로 학생 필터링).

`hasTeacherFilter && per-student` / `hasStudentFilter && per-teacher` 충돌 회피 — 화면 필터 활성 시 해당 mode 라디오 미렌더 (mutually exclusive).

## Multi-Perspective Analysis

### Maintainer
- `drawSessionBlock` 함수 단순화 — 단계 분기 명확 (height 조건 4개)
- `splitTextToSize` + `drawTextClamped` 헬퍼로 wrap/truncate 분리 — 향후 다른 PDF block 도 재사용 가능
- 출력 범위 자동 계산은 page.tsx 내 inline — 1회 사용 + 명확. 향후 다른 entry point (예: 강사별 PDF) 추가 시 util 추출 권장

### 학원 운영자 / 인쇄 사용자
- 한 row 에 subject + teacher 명확 → 종이 인쇄 시 즉시 인지
- 짧은 수업 (1h 미만) 도 시간 명시 → 시간표 운영 안전
- 1.5h+ 수업의 다인원 학생 명단 wrap → 출석부/학부모 공유 용도 강화
- 빈 공간 줄어든 PDF — 종이 절약

### Attacker / Operator
- frontend rendering 전용 — server/RLS 영향 X
- jsPDF 동기 처리 — race 없음
- `splitTextToSize` 는 jsPDF native 함수 — 한글 폰트 (Pretendard) 호환 검증 완료

## Devil's Advocate

### Weaknesses
1. **30분 미만 cell 에 시간 hidden** — 사용자가 시간 확인 어려움
   - 완화: 30분 미만 수업은 거의 없는 케이스 + cell 위치(시간축 격자) 로 추정 가능
2. **학생 wrap 2줄 한도** — 7+ 학생 다인원 수업은 추가 학생 hidden
   - 완화: `+N` 표시 또는 별도 학생 명단 페이지 (후속 PR)
3. **출력 범위 자동 union 정책** — 사용자가 명시 9-18시 설정해도 21시 데이터 있으면 자동 확장
   - 완화: 사용자 명시 timeRange 가 max 일 때 자동 확장이 자연스러움 (잘림 회피 우선)

### Rejected Alternatives
- **모든 길이 같은 정보**: 30분 cell 도 학생 표시 → 텍스트 overflow / 가독성 X
- **사용자 timeRange 강제**: 데이터 밖 사라짐 → 인쇄 후 누락 발견 사고 위험
- **시간 `HH:MM~HH:MM` 유지**: 한국 문맥 `~` 의 약 / 추정 의미 — 명확성 trade-off

### Uncertainties
- 학생 wrap 2줄 한도 — 다인원 사용자 보고 모니터링. 한도 조정 또는 별도 명단 페이지 (D4) 결정
- 출력 범위 union 정책 — 사용자 명시 timeRange 와 데이터 충돌 사례 모니터링

## Consequences

**Positive:**
- 사용자 보고 (1h truncate / 빈 공간 큰 PDF / 시선 흐름) 즉시 해소
- block 정보 우선순위 명문화 → 향후 디자인 변경 시 참조 SSOT
- 출력 범위 자동 union 으로 잘림 위험 0

**Negative / Trade-offs:**
- 30분 미만 cell 의 시간 표시 hidden — 드물지만 사용자 의문 가능성
- 학생 wrap 2줄 한도 — 다인원 부분 hidden
- 학생별 30명+ 시 `window.confirm` — modal 안 modal 패턴, UX 깊이 1단 더 (대안: inline warning 만 + 그냥 진행 — 100 PDF 다운로드 위험)

## References

- ADR-003: 시간표 색·필터·타임라인·오버플로우 (2026-04-29) — 시각 토큰 SSOT
- ADR-020: 필터-색 일치 + Lane Reorder (2026-05-21) — 본 ADR 의 모체
- PR #425: PDF button 노출 정책 + 필터 hidden 인쇄
- PR #427: 본 ADR 구현 (PdfSessionBlock 보정 + 출력 범위 자동)
- PR #428: D4 구현 (dropdown 강사별/학생별 활성 + perStudent mode 신설 + 30명+ guard)
- UAT 2026-05-21 사용자 보고
