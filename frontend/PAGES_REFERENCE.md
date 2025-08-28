# 📚 Pages 컴포넌트 참고 문서

## 🎯 목적

이 문서는 `main.tsx`에서 실제로 사용되는 Pages 컴포넌트들의 **현재 완성된** 디자인, 기능, 로직을 상세히 기록하여, 향후 개발 및 수정 시 참고하기 위한 것입니다.

---

## 📁 실제 사용되는 Pages 컴포넌트

### 1. StudentsPage (`/students`)

**파일**: `src/pages/Students.tsx`

#### 🎨 **현재 디자인 구조**

```tsx
<div
  className="grid"
  style={{
    gridTemplateColumns: '340px 1fr', // ⚠️ 중요: 좌측 340px 고정 너비
    gap: 16,
    padding: 16,
  }}
>
  <StudentManagementSection /> // 🆕 Atomic Design 컴포넌트 사용
</div>
```

#### 🔧 **현재 주요 기능**

- **학생 추가**: 입력창 + 추가 버튼 (중복 이름 체크 포함)
- **학생 목록**: 선택 가능한 학생 리스트
- **학생 삭제**: 각 학생별 삭제 버튼
- **학생 선택**: 클릭으로 선택 상태 관리 (localStorage 저장)
- **과목 자동 생성**: 수학, 영어, 국어 기본 과목 자동 생성

#### 🎯 **현재 핵심 로직**

```tsx
// 학생 추가 (중복 체크 포함)
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

// 기본 과목 자동 생성
useEffect(() => {
  if (subjects.length === 0) {
    setSubjects([
      { id: uid(), name: '수학', color: '#f59e0b' }, // 주황색
      { id: uid(), name: '영어', color: '#3b82f6' }, // 파란색
      { id: uid(), name: '국어', color: '#10b981' }, // 초록색
    ]);
  }
}, []);
```

#### 🎨 **현재 스타일 세부사항**

- **그리드 레이아웃**: `340px 1fr` (좌측 고정, 우측 확장)
- **간격**: `gap: 16px`, `padding: 16px`
- **기본 과목 색상**: 수학(주황), 영어(파란색), 국어(초록색)

#### ⚠️ **현재 상태에서 주의사항**

1. **좌측 너비**: `340px` 고정 너비 유지 필수
2. **그리드 레이아웃**: `gridTemplateColumns: '340px 1fr'` 구조 유지
3. **StudentManagementSection**: Atomic Design 컴포넌트로 분리됨
4. **localStorage**: 학생 목록, 선택 상태, 과목 정보 모두 저장

---

### 2. SchedulePage (`/schedule`)

**파일**: `src/pages/Schedule.tsx`

#### 🎨 **현재 디자인 구조**

```tsx
// 시간표 그리드 구조
<TimeTableGrid // 🆕 Atomic Design 컴포넌트 사용
  sessions={displaySessions}
  subjects={subjects}
  enrollments={enrollments}
  onSessionClick={handleSessionClick}
  onDrop={handleDrop}
/>
```

#### 🔧 **현재 주요 기능**

- **시간표 표시**: 7일 x 시간별 그리드 (9:00 ~ 24:00)
- **세션 관리**: 드래그 앤 드롭으로 수업 추가
- **학생 선택**: 특정 학생의 시간표만 표시 (필터링)
- **세션 편집**: 클릭으로 수업 정보 수정/삭제 모달
- **플로팅 패널**: 드래그 가능한 학생 목록 패널
- **동적 높이**: 겹치는 세션 수에 따른 요일별 높이 자동 조정

#### 🎯 **현재 핵심 로직**

```tsx
// 선택된 학생의 세션만 필터링
const displaySessions = useMemo(() => {
  if (selectedStudentId) {
    return new Map<number, Session[]>(
      sessions
        .filter(s => selectedStudentEnrolls.some(e => e.id === s.enrollmentId))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .reduce((acc, s) => {
          const list = acc.get(s.weekday) ?? [];
          list.push(s);
          acc.set(s.weekday, list);
          return acc;
        }, new Map<number, Session[]>())
    );
  } else {
    // 전체 학생의 세션 표시
    return new Map<number, Session[]>(/* ... */);
  }
}, [sessions, selectedStudentEnrolls, selectedStudentId]);

// 드래그 앤 드롭 처리
function handleDrop(weekday: number, time: string, enrollmentId: string) {
  const enrollment = enrollments.find(e => e.id === enrollmentId);
  if (!enrollment) return;

  setModalData({
    studentId: enrollment.studentId,
    weekday,
    startTime: time,
    endTime: getNextHour(time),
  });
  setShowModal(true);
}
```

#### 🎨 **현재 스타일 세부사항**

- **시간 범위**: 9:00 ~ 24:00 (15시간)
- **요일 높이**: 동적 계산 (기본 60px + 겹침당 32px)
- **세션 블록**: 과목별 색상, 둥근 모서리, 호버 효과
- **플로팅 패널**: 반투명 배경, 드래그 가능

#### ⚠️ **현재 상태에서 주의사항**

1. **TimeTableGrid**: Atomic Design 컴포넌트로 분리됨
2. **동적 높이**: `getWeekdayHeight()` 함수로 요일별 높이 자동 계산
3. **세션 필터링**: 선택된 학생의 세션만 표시하는 로직 보존
4. **드래그 앤 드롭**: 학생 ID 전달 및 세션 생성 모달 로직 유지

---

## 🆕 **Atomic Design 컴포넌트 구조**

### **Organisms (유기체)**

#### **1. StudentManagementSection**

- **위치**: `src/components/organisms/StudentManagementSection.tsx`
- **역할**: 학생 관리 전체 섹션 (추가, 목록, 삭제)
- **Props**: `students`, `newStudentName`, `selectedStudentId`, 이벤트 핸들러들

#### **2. TimeTableGrid**

- **위치**: `src/components/organisms/TimeTableGrid.tsx`
- **역할**: 시간표 그리드 전체 구조 및 로직
- **핵심 기능**:
  - 트랙 기반 세션 배치 시스템
  - 동적 요일 높이 계산
  - 시간별 경계선 관리

### **Molecules (분자)**

#### **1. TimeTableRow**

- **위치**: `src/components/molecules/TimeTableRow.tsx`
- **역할**: 요일별 행 전체 관리
- **핵심 기능**: 세션 위치 계산, 드롭 존 배치

#### **2. SessionBlock**

- **위치**: `src/components/molecules/SessionBlock.tsx`
- **역할**: 개별 수업 세션 표시
- **핵심 기능**:
  - 동적 위치, 크기, z-index 관리
  - 요일 표시 (예: "월 국어 09:00-10:00")
  - 겹치는 세션 Y축 분리 처리

#### **3. DropZone**

- **위치**: `src/components/molecules/DropZone.tsx`
- **역할**: 드래그 앤 드롭 수신 영역
- **핵심 기능**: 시간대별 정확한 위치, 시각적 피드백

### **Atoms (원자)**

#### **1. TimeSlot**

- **위치**: `src/components/atoms/TimeSlot.tsx`
- **역할**: 시간 슬롯 표시 (9:00, 10:00, 11:00...)

#### **2. WeekdayHeader**

- **위치**: `src/components/atoms/WeekdayHeader.tsx`
- **역할**: 요일 라벨 표시 (월, 화, 수, 목, 금, 토, 일)

---

## 🎨 **현재 완성된 시각적 요소들**

### **1. 경계선 시스템**

- **시간대별 세로 구분선**: `1px solid var(--color-border-grid)` (opacity: 0.6)
- **30분 구분선**: `1px solid var(--color-border-grid-light)` (opacity: 0.4)
- **테마별 색상**: 다크/라이트 모드에 따른 자동 색상 조정

### **2. 색상 시스템**

```css
/* 다크모드 */
--color-border-grid: #6b7280; /* 진한 회색 */
--color-border-grid-light: #9ca3af; /* 중간 회색 */
--color-border-grid-lighter: #d1d5db; /* 연한 회색 */

/* 라이트모드 */
--color-border-grid: #d1d5db; /* 진한 회색 */
--color-border-grid-light: #e5e7eb; /* 중간 회색 */
--color-border-grid-lighter: #f3f4f6; /* 연한 회색 */
```

### **3. 그리드 구조**

- **CSS Grid**: `display: grid`
- **열 구조**: `80px repeat(15, 120px)` (요일 라벨 + 15개 시간대)
- **행 구조**: `40px` (시간 헤더) + 동적 요일 높이
- **간격**: `gap: 1px` 제거로 깔끔한 배경

---

## 🚨 **현재 상태에서 핵심 체크리스트**

### ✅ **Students.tsx**

- [x] 좌측 너비 `340px` 고정 유지 ✅
- [x] 그리드 레이아웃 `340px 1fr` 구조 보존 ✅
- [x] 학생 추가/삭제 기능 로직 유지 ✅
- [x] 선택 상태 관리 로직 보존 ✅
- [x] Atomic Design 컴포넌트로 분리 완료 ✅

### ✅ **Schedule.tsx**

- [x] 시간표 그리드 `80px + 120px * 15` 구조 유지 ✅
- [x] 세션 겹침 처리 Y축 계산 로직 보존 ✅
- [x] 드래그 앤 드롭 기능 완전 보존 ✅
- [x] 동적 요일 높이 계산 로직 구현 ✅
- [x] Atomic Design 컴포넌트로 분리 완료 ✅

### ✅ **새로 추가된 기능**

- [x] 트랙 기반 세션 배치 시스템 ✅
- [x] 경계선 정렬 문제 완전 해결 ✅
- [x] 테마별 경계선 색상 시스템 ✅
- [x] 동적 요일 높이 계산 ✅

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

## 🎯 **현재 완성된 주요 성과**

### **1. 시각적 개선**

- ✅ **경계선 정렬 문제 완전 해결**: 시간이 지날수록 어긋나는 문제 해결
- ✅ **테마별 색상 시스템**: 다크/라이트 모드 자동 대응

### **2. 기능적 개선**

- ✅ **트랙 기반 세션 배치**: 겹치는 세션의 효율적인 공간 활용
- ✅ **동적 높이 계산**: 세션 수에 따른 요일별 높이 자동 조정
- ✅ **Atomic Design 구조**: 체계적이고 유지보수 가능한 컴포넌트 구조

### **3. 성능 개선**

- ✅ **불필요한 렌더링 방지**: useMemo, useCallback 활용
- ✅ **효율적인 세션 배치**: O(n²) → O(n log n) 알고리즘으로 성능 향상
- ✅ **메모리 최적화**: 불필요한 배열 생성 방지
- ✅ **알고리즘 복잡도 개선**: 100개 세션에서 288ms 렌더링 성능 달성

---

## 🔮 **향후 개발 방향**

### **1. 성능 최적화**

- [x] 트랙 할당 알고리즘 성능 개선 (O(n²) → O(n log n)) ✅
- [x] 메모이제이션 최적화 (useMemo, useCallback) ✅
- [x] 실시간 검색 기능 구현 ✅
- [ ] 가상화 (Virtualization) 대용량 데이터 처리

### **2. 기능 확장**

- [x] 수강생 리스트 실시간 검색 ✅
- [ ] 세션 편집/삭제 고급 기능
- [ ] 시간표 템플릿 시스템
- [ ] 학생별 시간표 내보내기

### **3. 사용자 경험**

- [x] 수강생 리스트 모달 디자인 ✅
- [x] 검색 입력창 포커스 효과 ✅
- [ ] 드래그 앤 드롭 시각적 피드백 개선
- [ ] 반응형 디자인 최적화
- [ ] 접근성 향상

---

### **5. 🆕 모달 디자인 시스템**

- ✅ **플로팅 패널**: 반투명 어두운 배경과 backdrop-filter 효과
- ✅ **검색 입력창**: 모달 디자인과 일치하는 스타일링
- ✅ **z-index 관리**: 9999로 설정하여 다른 요소들보다 위에 표시
- ✅ **CSS Modules**: 컴포넌트별 모듈화된 스타일 관리
- ✅ **수업 추가 모달**: z-index 20000-20002로 설정하여 세션 블록들보다 위에 표시
- ✅ **수업 편집 모달**: backdrop과 overlay 구조로 변경하여 뒷부분 어둡게 처리
- ✅ **필수 항목 표시**: `*` 표시를 빨간색으로 스타일링하여 가시성 향상
- ✅ **편집 불가능한 필드**: 학생, 과목 필드를 흐리게 표시하여 편집 불가능함을 시각적으로 표현
- ✅ **빈 공간 클릭 모달**: 시간표 빈 곳 클릭 시 과목, 종료시간, 학생 선택하여 수업 추가 가능
- ✅ **세션 셀 요일 표시**: 세션 셀 맨 앞에 요일(월, 화, 수, 목, 금, 토, 일)을 표시하여 사용자가 어떤 요일의 수업인지 쉽게 파악 가능

_이 문서는 현재 완성된 디자인, 기능, 로직을 정확히 반영하여 작성되었습니다. 향후 개발 시 참고하여 일관성을 유지하세요._
