# ADR-019: First-user owner-enforcement + Academy Singularity (1+1) Policy

**상태:** Accepted
**일자:** 2026-05-20
**관련 PR:** #413 (예정)
**관련 ADR:** ADR-002 (Academy 멀티테넌트 아키텍처), ADR-013 (Anonymous migration), ADR-015 (Teacher permission domain)

## 컨텍스트

학원 멀티테넌트 구조(ADR-002, Phase K — 2026-05-02)에서 사용자가 진입 시점 3-role(owner/admin/member) 중 선택 가능한 onboarding 폼이 노출되어 있었음:

```
[학원명 input]
[원장 / 관리자 / 강사] 라디오  ← 사용자 선택
[시작하기]
```

이로 인해 다음 결함이 발생:
- 사용자가 "관리자" 또는 "강사" 선택 시 `/api/onboarding` POST가 그대로 처리 →
  **owner 없는 유령 학원** 생성.
- owner 없는 학원에서는 멤버 초대(`/api/invites` POST)가 RLS로 막혀 사용자가
  완전히 stuck.
- 정상 시나리오에서 admin/member로 진입할 유일한 경로는 **초대 링크 수락
  (`/invite/[token]`)** 이므로 onboarding 폼의 role 라디오 자체가 잘못된 진입점.

추가로 멀티-academy 정책이 코드 주석(Sidebar.tsx line 302-304 "추후 업데이트")
에만 존재해 미래 세션·새 개발자가 의도를 잃을 위험. 사용자(HYUNJIN) 명시:
"본인 학원 1개 제한 + 초대받은 거 1개 제한으로 하고싶음" (2026-05-20).

## 결정

### 정책 1 — 첫 학원 생성자는 owner 강제
첫 진입(no invite, fresh user)으로 학원을 생성하는 사용자는 **무조건 owner**.
admin/member 역할은 **초대 수락을 통해서만** 부여 가능.

### 정책 2 — Academy Singularity (1+1)
각 사용자는 다음 두 학원 유형을 **최대 1개씩** 보유:
- **본인 owner 학원:** 1개 (첫 onboarding에서 생성)
- **초대 합류 학원:** 1개 (admin 또는 member 역할)

총 최대 2개 academy_members 행. 추가 onboarding 진입 (이미 owner 학원 보유 시)
또는 추가 초대 수락 (이미 invited 학원 보유 시)은 차단.

### 정책 3 — 학원 추가 기능 deferred
`POST /api/academies` 엔드포인트 및 sidebar "+ 새 학원 만들기" UI는 위 1+1
제한 도달 전까지 **의도적 미구현**. 사용자가 분원·멀티-브랜드 운영 요구 발생
시 정책 재검토 (정책 5 트리거).

### 정책 4 — 강제 layer (Defense-in-depth는 다음 사이클)
이번 PR에서는 ADR + 코드 주석 + 자연 가드만:
- onboarding API: `body.role` 무시 + `role: "owner"` 하드코딩 (서버 안전망)
- onboarding UI: 역할 라디오 제거 (Variant E — 학원명 + Crown 안내 + secondary
  "초대 받았어요" link)
- Sidebar "+ 새 학원": disabled placeholder + ADR-019 tooltip
- 첫 학원 생성자는 `/api/onboarding` 멱등성으로 두 번째 owner 생성 불가
  (이미 academy_member 행 있으면 returnX 기존 academyId)

**DB constraint, invite accept API check, UI warn state는 학원 추가 기능
도입 시점에 함께 도입** (현재는 자연 가드로 충분).

### 정책 5 — 변경 트리거
다음 케이스 발생 시 정책 재검토 + ADR 후속작 작성:
- 사용자가 owner 2개 이상 필요한 케이스 명시 (분원, 멀티-브랜드, 컨설팅사 등)
- "초대 합류 학원 2개+" 요구 명시 (예: 프리랜서 강사가 여러 학원 동시 소속)
- 학원 인수/합병 시나리오 (owner 이양 + 기존 학원 폐쇄)
재검토 시 `POST /api/academies` + sidebar 활성화 + DB constraint 동시 도입.

## 대안

### 대안 A — 현재 라디오 유지, validation만 강화
"admin/member 선택 시 경고 표시 + owner 추천" 식 hint.
- **기각 이유:** 사용자 의도가 불명확한 진입에 친절한 hint는 UX 마찰만 가중. 잘못된 선택지를 노출하는 것 자체가 결함.

### 대안 B — onboarding에서 invite token 입력 통합 (Variant D)
"학원명 OR 초대 코드" 단일 input + smart detect.
- **기각 이유:** input 의도 ambiguous. 학원명 형식과 초대 코드 형식이 명확히 분리 X. 한국어 학원명(`해피수학학원`)과 초대 코드(`abc-def-123`)의 detect 로직이 부정확하면 잘못된 흐름 진입.

### 대안 C — 학원 추가 기능 이번 PR에 함께 도입 (Option 2)
`POST /api/academies` + sidebar 활성화 + 데이터 격리/active 전환 UX 변경.
- **기각 이유:** 사용자 명시 "학원 추가는 일단 막아두고" (2026-05-20). PR 크기 폭증 + 데이터 격리·active 전환 UX는 별도 design exploration + 정책 검증 필요.

### 대안 D — DB partial unique constraint 즉시 도입
`CREATE UNIQUE INDEX ON academy_members (user_id) WHERE role='owner'`.
- **기각 이유:** 마이그레이션 수반 + 기존 데이터(현재 owner 중복 없음, 정상 상태) 검증 필요. ADR로 정책 영구화 후 학원 추가 기능 도입 시점에 함께 (방어 깊이 일관성).

## 결과

### Positive
- owner-less 유령 학원 생성 차단 (S-1.5 UAT 시나리오 정상 작동)
- 정책이 ADR + UAT + 코드 주석에 영구화 → 미래 세션·신규 개발자가 라디오 부활/학원 추가 무분별 도입 차단
- 학원 추가 기능 미구현이 "deferred 결함"이 아닌 **정책적 결정**임이 명시됨

### Negative
- "초대로 시작 후 본인 학원 만들고 싶다"는 사용자는 우회 불가 (별도 OAuth 계정 필요) — 정책 5 트리거 모니터 필요
- DB 레벨 강제 없음 — Service Role 키로 직접 INSERT 시 우회 가능 (현재 위협 모델에서 무시 가능)

### Devil's Advocate

**Weakness 1:** "초대로 시작 + 본인 학원 만들기" 케이스 발견 시 우회 안내가 어색함.
→ 정책 5 트리거 모니터로 빈도 추적. 3회+ 보고 시 학원 추가 기능 도입 사이클 진행.

**Weakness 2:** ADR이 강제력 없음 — 향후 PR에서 다시 라디오 추가될 가능성.
→ onboarding API의 `role` 무시 + UAT S-1.5 회귀 가드로 자연 차단. 신규 라디오 추가하려면 UAT + API + Sidebar 3곳 동시 변경 필요 → 의도성 보장.

**Uncertainties:**
- 정책 2의 "invited 학원 1개"가 멀티-academy 사용자(현재 0명) 발생 시 실제로 어떻게 작동하는지는 미관찰 — 발생 시 monitoring 필요.

## 참고
- Sidebar.tsx line 302-313 "+ 새 학원 만들기" disabled placeholder (이번 PR ADR 참조 코멘트 추가)
- `tests/manual/uat-checklist.md` S-1.5 (이번 PR 갱신)
- ADR-002 § Academy 멀티테넌트 데이터 모델
- design exploration: `/design-explorations/onboarding-role` (5 variants + 권한 매트릭스 영구 보존)
