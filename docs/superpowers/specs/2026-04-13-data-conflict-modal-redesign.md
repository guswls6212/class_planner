# DataConflictModal 리디자인 스펙

**날짜:** 2026-04-13  
**상태:** 승인됨  
**대상 파일:**
- `src/components/molecules/DataConflictModal.tsx`
- `src/components/molecules/DataConflictModal.module.css`

---

## 배경 및 목적

현재 DataConflictModal은 두 가지 문제가 있다.

1. **정보 부족:** 로컬 데이터의 카운트(학생 N명, 과목 N개)만 표시하고 서버 데이터는 아예 보여주지 않아, 사용자가 어느 쪽을 선택해야 할지 맥락 없이 결정해야 한다.
2. **버튼 편향:** "로컬 데이터 사용" 버튼이 primary(파란색) 스타일이라 의도치 않게 로컬 선택을 유도하는 것처럼 보인다.

목적: 양쪽 데이터를 동등하고 명확하게 비교할 수 있도록 개선하여 사용자가 정보에 근거한 선택을 할 수 있게 한다.

---

## 디자인 결정사항

### 1. 레이아웃 — 반응형 이중 구조

| 화면 너비 | 레이아웃 |
|-----------|---------|
| 640px 이상 (데스크탑) | Side-by-Side 카드 — 로컬/서버 카드 좌우 배치 |
| 640px 미만 (모바일) | 탭 전환 — 로컬/서버 탭을 전환하며 확인 |

### 2. 표시 데이터

- **학생:** 이름 목록 전체 표시 (스크롤 영역, max-height 제한)
- **과목:** 디폴트 과목 제외 후 이름 목록 표시
  - 디폴트 과목 기준: `useGlobalDataInitialization.ts`의 `DEFAULT_SUBJECTS` 배열과 이름이 일치하는 항목 필터링
  - 양쪽(로컬·서버) 모두에서 동일하게 필터링
- **수업(sessions):** 개수만 표시 (이름 없음, 구조상 동기화 대상 아님)
- **서버 데이터:** 현재 `_serverData`로 미사용 상태 → 실제로 렌더링

### 3. 인터랙션 — 카드 전체 클릭

- 별도 버튼 없음. 카드 자체를 클릭하면 선택
- hover: 테두리 밝아짐 + 미세 리프트(translateY -1px)
- selected: 인디고(#6366f1) 테두리 + glow + 체크 아이콘 활성화
- 모바일: 탭 하단에 "X 데이터로 시작" 버튼 (outlined, 양쪽 동일 스타일)

### 4. 세션 미동기 경고

로컬 데이터를 선택할 때 수업 일정(sessions)은 서버에 동기화되지 않는다(현재 코드의 알려진 한계, `handleLoginDataMigration.ts` 참조). 모달 하단에 amber 경고 배너로 이를 사용자에게 명시한다.

---

## 컴포넌트 설계

### Props 변경사항

```typescript
// 기존
interface DataConflictModalProps {
  localData: ClassPlannerData;
  serverData: ClassPlannerData;  // _serverData로 미사용
  onSelectServer: () => void;
  onSelectLocal: () => void;
}

// 변경 없음 — props 구조는 유지, 내부에서 serverData를 실제 사용
```

### 디폴트 과목 필터링

`DataConflictModal` 내부 또는 별도 유틸에서:

```typescript
const DEFAULT_SUBJECT_NAMES = new Set([
  "초등수학", "중등수학", "중등영어", "중등국어", "중등과학",
  "중등사회", "고등수학", "고등영어", "고등국어",
]);

function filterNonDefaultSubjects(subjects: Subject[]): Subject[] {
  return subjects.filter(s => !DEFAULT_SUBJECT_NAMES.has(s.name));
}
```

### 데이터 카드 구조 (데스크탑)

```
DataCard
├── CardSource (label: "로컬 데이터" | "서버 데이터" + dot)
├── Section: 학생
│   └── NameList (scrollable, max-height: 96px)
├── Section: 과목 (디폴트 제외)
│   └── NameList (scrollable, max-height: 96px)
├── Section: 수업 (개수만)
└── SelectHint (체크 아이콘 + "클릭하여 선택" | "✓ 선택됨")
```

### 모바일 탭 구조

```
TabBar (로컬 데이터 | 서버 데이터)
TabContent
├── 학생 NameList
├── 과목 NameList (디폴트 제외)
├── 수업 개수
└── SelectButton ("X 데이터로 시작")
```

---

## 스타일 가이드라인

- 배경: `#1e293b` (현재 다크 테마 유지)
- 카드 테두리: `rgba(148,163,184,0.15)` → hover `rgba(148,163,184,0.45)` → selected `#6366f1`
- 섹션 레이블: `10-11px`, uppercase, `#475569`
- 이름 텍스트: `13px`, `#cbd5e1`
- 경고 배너: `rgba(251,191,36,0.06)` bg + `rgba(251,191,36,0.2)` border + `#fbbf24` text
- 모달 최대 폭: 데스크탑 660px / 모바일 380px
- CSS Module 방식 유지 (`DataConflictModal.module.css`)

---

## 검증 계획

1. **Playwright E2E:**
   - 로그인 전 학생/과목 추가 → 로그인 → 충돌 모달 렌더 확인
   - 디폴트 과목이 목록에서 제외되는지 확인
   - 데스크탑(1280px): 카드 클릭 선택 → 데이터 적용 확인
   - 모바일(375px): 탭 전환 → 버튼 클릭 → 데이터 적용 확인
2. **수동 검증:**
   - Playwright MCP로 스크린샷 캡처 (양쪽 상태 모두)
   - 수업 미동기 경고 표시 여부 확인
