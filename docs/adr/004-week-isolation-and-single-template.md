# ADR-004: 주별 격리 모델 + 1개 고정 템플릿

**Date:** 2026-04-30  
**Status:** Accepted

## Context

기존 시간표 도메인에는 "주(week)" 식별자가 없어 모든 주가 동일 weekday 패턴을 공유했다.
이로 인해 다음 문제가 발생:
- 지난 주 수업과 이번 주 수업이 구분 없이 표시됨
- 공유 링크가 모든 주의 데이터를 한꺼번에 노출
- 템플릿 적용 시 기존 데이터와 누적/혼재

## Decision

### 주별 격리 (weekStartDate)
- `Session` 모델에 `weekStartDate: string` (KST 기준 월요일 ISO date) 추가
- 모든 조회/필터링은 weekStartDate를 기준으로 수행
- localStorage 기존 데이터: 마이그레이션 시점의 현재 주로 일괄 할당 (사용자 동의)
- DB 기존 데이터: SQL 마이그레이션 `031_add_week_start_date_to_sessions.sql`로 일괄 처리

### 템플릿 1개 고정 + 편집 가능
- 학원당 1개 템플릿 (API가 `created_at DESC` 정렬하여 첫 번째를 `activeTemplate`으로 사용)
- 이미 존재하면 PUT으로 덮어쓰기, 없으면 POST
- 템플릿 적용: 현재 주 세션 삭제 → 템플릿 세션 생성 (교체 방식)

### id 기반 엔티티 매칭
- `TemplateSessionDef`의 `subjectId`, `studentIds`, `teacherId`로 매칭
- 이름 기반 매칭 및 자동 생성 없음
- 매칭 실패 시: 해당 세션 스킵 + 토스트 경고

## Alternatives Considered

### 이름 기반 매칭 (거부)
- 이유: 오타로 유령 학생 생성 가능, 이름 변경 시 매칭 깨짐

### 학원당 다중 템플릿 (거부)
- 이유: 5명 규모 학원에서 복잡도 대비 사용성 이점 없음
- 향후 확장 가능

### localStorage-only 주별 격리 (거부)
- 이유: DB도 동기화되어야 공유 링크가 올바르게 동작함

## Consequences

### 긍정
- 주간 단위 독립성 확보: 다른 주 이동 시 별도 데이터 표시
- 공유 링크: 현재 주 자동 노출, 주별 필터링 가능
- 템플릿 적용이 명확하고 예측 가능 (교체 방식)

### 부정/트레이드오프
- 기존 attendance 데이터가 마이그레이션 시점 주로 묶임 (사용자 동의)
- 학원 간 템플릿 공유 불가 (id는 academy 종속) — 현재 단일 학원 주류라 허용
- `weekStartDate: ""` stub이 Task 1.2~1.3에 남아있음 (Phase 3 localStorage 마이그레이션으로 보완)
