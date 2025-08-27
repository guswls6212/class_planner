# 📚 Pages 컴포넌트 참고 문서

## 🎯 목적

이 문서는 `main.tsx`에서 실제로 사용되는 Pages 컴포넌트들의 디자인, 기능, 로직을 상세히 기록하여, Atomic Design 리팩토링 시 디자인이 깨지지 않도록 참고하기 위한 것입니다.

---

## 📁 실제 사용되는 Pages 컴포넌트

### 1. StudentsPage (`/students`)

**파일**: `src/pages/Students.tsx`

#### 🎨 **디자인 구조**

```tsx
<div className="grid" style={{
  gridTemplateColumns: '340px 1fr',  // ⚠️ 중요: 좌측 340px 고정 너비
  gap: 16,
  padding: 16,
}}>
```

#### 🔧 **주요 기능**

- **학생 추가**: 입력창 + 추가 버튼
- **학생 목록**: 선택 가능한 학생 리스트
- **학생 삭제**: 각 학생별 삭제 버튼
- **학생 선택**: 클릭으로 선택 상태 관리

#### 🎯 **핵심 로직**

```tsx
// 학생 추가
function addStudent() {
  const name = newStudentName.trim();
  if (!name) return;

  // 중복 이름 체크
  if (students.some(s => s.name === name)) {
    alert('이미 존재하는 학생 이름입니다.');
    return;
  }

  const student: Student = { id: uid(), name };
  setStudents(prev => [...prev, student]);
  setNewStudentName('');
}
```

#### 🎨 **스타일 세부사항**

- **입력창**: `width: 200px`, `padding: 8px 12px`
- **추가 버튼**: `padding: 8px 16px`, `background: var(--color-primary)`
- **학생 리스트**: `maxHeight: 400px`, `overflow: auto`
- **삭제 버튼**: `padding: 4px 8px`, `background: var(--color-danger)`

#### ⚠️ **Atomic Design 시 주의사항**

1. **좌측 너비**: `340px` 고정 너비 유지 필수
2. **그리드 레이아웃**: `gridTemplateColumns: '340px 1fr'` 구조 유지
3. **스크롤 처리**: 학생이 10명 이상일 때 스크롤 메시지 표시
4. **선택 상태**: 선택된 학생의 이름을 굵게 표시

---

### 2. SchedulePage (`/schedule`)

**파일**: `src/pages/Schedule.tsx`

#### 🎨 **디자인 구조**

```tsx
// 시간표 그리드 구조
<div className="grid grid-rows-header grid-cols-auto gap-grid" style={{
  gridTemplateColumns: `80px repeat(${hourCols}, 120px)`,  // ⚠️ 중요: 시간축 80px, 시간슬롯 120px
}}>
```

#### 🔧 **주요 기능**

- **시간표 표시**: 7일 x 시간별 그리드
- **세션 관리**: 드래그 앤 드롭으로 수업 추가
- **학생 선택**: 특정 학생의 시간표만 표시
- **세션 편집**: 클릭으로 수업 정보 수정/삭제

#### 🎯 **핵심 로직**

```tsx
// 겹치는 세션 Y축 배치
function getSessionPosition(session: Session, weekday: number) {
  const daySessions = displaySessions.get(weekday) || [];

  // 같은 요일에서 시간이 겹치는 세션들을 찾기
  const overlappingSessions = daySessions.filter(s => {
    if (s.id === session.id) return false;

    // 시간이 겹치는지 확인
    const sStart = timeToMinutes(s.startsAt);
    const sEnd = timeToMinutes(s.endsAt);
    const sessionStart = timeToMinutes(session.startsAt);
    const sessionEnd = timeToMinutes(session.endsAt);

    return sStart < sessionEnd && sessionStart < sEnd;
  });

  // 겹치는 세션이 없으면 0번째 위치
  if (overlappingSessions.length === 0) return 0;

  // 겹치는 세션 그룹의 순서로 Y축 위치 결정
  const allOverlapping = [...overlappingSessions, session].sort(
    (a, b) => timeToMinutes(a.startsAt) - timeToMinutes(b.startsAt)
  );

  const sessionIndex = allOverlapping.findIndex(s => s.id === session.id);
  return sessionIndex;
}
```

#### 🎨 **스타일 세부사항**

- **시간 헤더**: `80px` 고정 너비
- **시간 슬롯**: `120px` 고정 너비
- **세션 블록**: 동적 높이, 겹침 처리
- **드롭 존**: `120px` 너비, 점선 테두리

#### ⚠️ **Atomic Design 시 주의사항**

1. **그리드 구조**: `80px + repeat(hourCols, 120px)` 레이아웃 유지
2. **시간 계산**: `DAY_START_MIN` ~ `DAY_END_MIN` 범위 유지
3. **겹침 처리**: Y축 오프셋 계산 로직 보존
4. **드래그 앤 드롭**: 학생 ID 전달 및 세션 생성 로직 유지

---

## 🚨 **Atomic Design 리팩토링 시 핵심 체크리스트**

### ✅ **Students.tsx**

- [ ] 좌측 너비 `340px` 고정 유지
- [ ] 그리드 레이아웃 `340px 1fr` 구조 보존
- [ ] 학생 추가/삭제 기능 로직 유지
- [ ] 선택 상태 관리 로직 보존
- [ ] 스크롤 처리 및 메시지 표시

### ✅ **Schedule.tsx**

- [ ] 시간표 그리드 `80px + 120px * hourCols` 구조 유지
- [ ] 세션 겹침 처리 Y축 계산 로직 보존
- [ ] 드래그 앤 드롭 기능 완전 보존
- [ ] 시간 계산 함수들 (`timeToMinutes`, `minutesToTime`) 유지
- [ ] 세션 편집/삭제 모달 기능 보존

### 🔧 **공통 사항**

- [ ] `useLocal` 훅 로직 보존
- [ ] CSS 변수 사용 (`var(--color-*)`) 유지
- [ ] 반응형 디자인 고려
- [ ] 접근성 속성 유지

---

## 📝 **참고 명령어**

### **현재 상태 확인**

```bash
# Git 상태 확인
git status

# 현재 브랜치 확인
git branch

# 최근 커밋 확인
git log --oneline -5
```

### **컴포넌트 테스트**

```bash
# ESLint 검사
npm run lint

# 테스트 실행
npm test

# 개발 서버 실행
npm run dev
```

### **Storybook 확인**

```bash
# Storybook 실행
npm run storybook
```

---

## 🎯 **성공적인 Atomic Design 리팩토링을 위한 팁**

1. **단계별 진행**: 한 번에 모든 것을 바꾸지 말고 단계별로 진행
2. **기능 테스트**: 각 단계마다 기능이 제대로 작동하는지 확인
3. **디자인 비교**: 원본과 새 컴포넌트를 나란히 비교하여 차이점 확인
4. **CSS 변수 활용**: 기존 CSS 변수들을 최대한 활용하여 일관성 유지
5. **백업 커밋**: 각 단계마다 커밋하여 문제 발생 시 쉽게 되돌릴 수 있도록 함

---

_이 문서는 Atomic Design 리팩토링 시 디자인과 기능이 깨지지 않도록 참고하기 위해 작성되었습니다._
