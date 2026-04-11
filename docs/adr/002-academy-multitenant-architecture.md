# ADR-002: Academy 기반 멀티테넌트 아키텍처 도입

## 상태
Accepted (2026-04-11)

## 컨텍스트
class-planner는 초기에 단일 운영자(1명)를 대상으로 설계되었다. 데이터 모델은 `user_id FK` 기반으로 사용자별 데이터를 분리하는 단순한 구조였다.

Phase 2A에서 JSONB → 정규화 테이블 마이그레이션을 진행하면서, 장기적으로 다중 운영자 SaaS로 확장할 것이 결정되었다. 이 시점에 데이터 모델의 근간을 정하지 않으면, 나중에 `user_id → academy_id` 전환을 위해 전체 스키마와 코드를 다시 뒤집어야 한다.

확장 요구사항:
- 운영자가 자율적으로 가입 후 학원을 생성할 수 있어야 함 (SaaS 성장 모델)
- 한 운영자가 여러 학원을 운영할 수 있어야 함
- 하나의 학원에 여러 운영자가 공동으로 참여할 수 있어야 함 (초대 기반)
- 학원 데이터는 운영자 계정이 아니라 학원 단위로 소유되어야 함

## 결정
**Academy 기반 멀티테넌트 구조**: 모든 비즈니스 데이터의 소유 단위를 `user`에서 `academy`로 변경한다.

### 핵심 데이터 모델

```sql
-- 학원 (테넌트 단위)
academies (
  id          UUID PK,
  name        TEXT NOT NULL,
  created_by  UUID FK → auth.users,
  created_at  TIMESTAMPTZ
)

-- 학원 구성원 (운영자 ↔ 학원 관계)
academy_members (
  academy_id  UUID FK → academies,
  user_id     UUID FK → auth.users,
  role        TEXT CHECK (role IN ('owner', 'admin', 'member')),
  invited_by  UUID FK → auth.users,
  joined_at   TIMESTAMPTZ,
  PRIMARY KEY (academy_id, user_id)
)

-- 비즈니스 데이터: academy_id FK로 소유권 부여
students           (id, academy_id FK, name, gender)
subjects           (id, academy_id FK, name, color)
enrollments        (id, student_id FK, subject_id FK)
sessions           (id, academy_id FK, weekday, starts_at, ends_at, room, y_position)
session_enrollments(session_id FK, enrollment_id FK)
```

### 온보딩 플로우
1. Google/Kakao OAuth 로그인
2. 첫 로그인 감지 → 온보딩 페이지로 이동
3. 학원명 입력 → `academies` 레코드 생성, `academy_members`에 `owner`로 등록
4. 이후 추가 학원 생성 또는 초대 수락 가능

### 역할 정의
- **owner:** 학원 삭제, 멤버 관리, 모든 데이터 접근
- **admin:** 멤버 초대, 모든 데이터 접근
- **member:** 시간표/학생/과목 데이터 접근 (읽기/쓰기)

### RLS 정책 방향
- 모든 비즈니스 테이블: `academy_id IN (SELECT academy_id FROM academy_members WHERE user_id = auth.uid())`
- `academies`: 본인이 member인 학원만 접근
- `academy_members`: owner/admin만 다른 멤버 추가/삭제

## 선택 이유
- **정규화 마이그레이션 타이밍:** JSONB → 정규화를 어차피 Phase 2A에서 진행하므로, 이 시점에 `academy_id`를 처음부터 반영하면 추가 마이그레이션 비용이 없다.
- **SaaS 성장 모델:** 자율 가입 + 학원 생성 플로우가 있어야 신규 운영자가 마찰 없이 유입될 수 있다.
- **Supabase Auth 유지:** 기존 OAuth 흐름을 그대로 유지하면서 그 위에 academy 레이어만 추가하므로 Auth 재작성이 불필요하다.

## 기각된 대안
- **user_id 기반 유지 후 나중에 academy_id 전환:** 정규화 후 또 한 번 스키마 전체를 뒤집어야 함. 마이그레이션 비용 2배.
- **organization_id (GitHub 모델):** 학원이라는 도메인 용어가 더 명확하고, 운영자에게 직관적. 기술적 차이 없음.
- **단일 운영자 모델 유지:** Phase 4 기능(다중 학원, 공동 운영)을 구현할 수 없음.

## 결과
### 장점
- 정규화 마이그레이션과 멀티테넌트 구조를 한 번에 해결
- Supabase RLS로 테넌트 격리를 DB 레벨에서 보장
- 향후 결제/구독 도입 시 academy 단위 과금이 자연스럽게 연결됨

### 단점
- 온보딩 플로우 구현이 필요 (기존 없음)
- 기존 1명의 사용자 데이터를 academy 구조로 마이그레이션해야 함
- RLS 정책 복잡도 증가

### 리스크
- 마이그레이션 중 기존 사용자 데이터 유실 가능성 → 마이그레이션 스크립트 작성 후 스테이징 환경에서 검증 필수
- Supabase 무료 티어: 테이블 수 증가로 row 수 증가 → 500MB 한도 모니터링 필요
