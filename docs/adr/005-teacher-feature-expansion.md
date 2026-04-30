# ADR-005: 강사 기능 확장 — 프로필 필드 + 과목 M:N 매핑

## 상태
Accepted

## 컨텍스트
현재 Teacher 엔티티는 name, color, userId만 가짐. 학원 운영자가 강사의 연락처(이메일, 전화)와 역할, 메모를 관리하고, "이 강사는 어떤 과목을 담당하는지"를 명시적으로 등록하여 수업 추가 모달에서 해당 강사의 과목을 우선 노출할 수 있어야 함.

## 결정
1. teachers 테이블에 email, phone, role(CHECK: owner/admin/member), notes 컬럼 추가 (모두 nullable).
2. teacher_subjects 조인 테이블 신설 (teacher_id, subject_id 복합 PK, academy_id 비정규화 인덱스용).
3. M:N 선택: 1:1은 강사가 복수 과목 담당하는 현실 비적합. M:N 없음은 모달에서 과목 우선순위 노출 불가.

## 결과
- 강사 페이지에서 담당 과목 chip multi-select로 설정 가능.
- 수업 추가 모달에서 강사 선택 시 해당 강사의 담당 과목 목록 우선 정렬.
- email/phone/role/notes는 선택 입력 (NOT NULL 아님).

## 기각된 대안
- 1:1 매핑 (teachers.subject_id FK): 복수 과목 담당 불가 — 기각.
- 세션에서 간접 추론: 수업 없는 신규 강사는 담당 과목 미정 → 기각.
