# 버전 관리 전략 (Version Management Strategy)

## 개요

Class Planner 프로젝트의 Git 브랜칭 전략과 CI/CD 연동을 정의한다.
**main → dev → feature** 모델을 채택하여 2단계 검증 후 프로덕션 배포.

## 브랜치 모델

```
main (프로덕션 — Lightsail 자동 배포)
  ↑ PR only (CI 통과 필수, --no-ff merge)
dev (통합/검증 — CI 실행, 배포 없음)
  ↑ PR only (CI 통과 필수, --no-ff merge)
feature/xxx, fix/xxx, phaseN/xxx (작업 브랜치)
```

### main 브랜치
- 프로덕션 코드. 항상 배포 가능한 상태.
- dev→main PR만 허용. 직접 push 금지.
- push 시 CI 실행 → 성공 시 deploy.yml 자동 배포.

### dev 브랜치
- 통합/검증 브랜치. 다음 릴리스 준비.
- 작업 브랜치→dev PR만 허용. 직접 push 금지.
- push 시 CI 실행 (배포 없음).

### 작업 브랜치
- 항상 dev에서 분기. dev로 PR.
- 명명: `feature/기능명`, `fix/버그명`, `phaseN/설명`
- 세션 완료 시 PR 생성 + 로컬 브랜치 삭제.

### hotfix 브랜치
- 예외적으로 main에서 분기.
- main + dev 양쪽에 PR.
- 명명: `hotfix/긴급수정내용`

## CI/CD 연동

### ci.yml (검증)
- **트리거**: PR 생성 / main·dev push
- **파이프라인**: type-check → lint → unit test → production build → E2E test

### deploy.yml (배포)
- **트리거**: main CI 성공 시 자동 실행
- **동작**: Docker image build → ghcr.io push → Lightsail SSH deploy → health check

### 플로우

```
feature → PR to dev → CI(PR) → 머지 → CI(dev push)
                                          ↓
                              dev → PR to main → CI(PR) → 머지
                                                           ↓
                                                    CI(main push) → deploy
```

## 버전 번호 (Semantic Versioning)

형식: `MAJOR.MINOR.PATCH` (예: v1.0.1)

| 구분 | 변경 조건 | 예시 |
|------|----------|------|
| MAJOR | 호환성 깨지는 큰 변경 | v1.1.5 → v2.0.0 |
| MINOR | 호환되는 기능 추가 | v1.0.1 → v1.1.0 |
| PATCH | 버그 수정 | v1.0.0 → v1.0.1 |

## 세션 중단 감지

정상 완료된 세션은 항상 PR 생성 + 로컬 브랜치 삭제.
**로컬에 남아있는 작업 브랜치 = 중단된 세션.**

```bash
# 미완료 브랜치 확인
bash scripts/check-stale-branches.sh
```

## 릴리스 체크리스트

### 작업 완료 시
- [ ] 작업 브랜치 → dev PR 생성
- [ ] CI 통과 확인
- [ ] dev로 머지
- [ ] 로컬 작업 브랜치 삭제

### 배포 시
- [ ] dev → main PR 생성
- [ ] CI 통과 확인
- [ ] main으로 머지 (자동 배포)
- [ ] 배포 성공 확인

---

**마지막 업데이트**: 2026-04-12
