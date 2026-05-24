# Phase 1 dev → main Release Checklist (Stage E)

> Stage E of `/design-explorations/phase1-release-readiness`. 친구 학원 운영자
> 선공개 = production main 머지 + Lightsail deploy. 본 체크리스트가 main
> 머지의 단일 진입점.

## 사전 조건 (Stage A-D 완료 후 진입)

- [x] Stage A — `/design-explorations/phase1-release-readiness` 페이지 작성
- [x] Stage B — `monetization-strategy` fact 5곳 수정 (OAuth/데이터백업/권한/PR
      카운트/SafetyNet)
- [x] Stage D — `test:release` 인프라 (prod-smoke spec + package.json scripts +
      `docs/production-test-guide.md`)
- [x] Stage C — UAT `§22 Phase 1 Production Readiness Mode` 신설
- [ ] **Stage E 진입 결정** — 사용자가 친구 선공개 의사 결정

## 0. 준비 단계 (Stage E 시작 전)

### 0.1 npm install

`start-server-and-test` devDependency 가 추가됨 (Stage D). 첫 실행 전 1회:

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npm install
```

### 0.2 Top 10 부족 항목 — 최소 권장 4개 구현 결정

본 체크리스트 진입 전, `/design-explorations/phase1-release-readiness` 의 "②
부족 Top 10" 중 다음 4개 우선 구현 권장:

- **rank 1**: In-app 피드백 채널 (Sidebar + `/api/feedback` + Supabase 테이블)
  — 친구 피드백 수집 인프라
- **rank 4**: Plausible / Vercel Analytics — WAU measurement
- **rank 8**: Sentry — production 사용자 에러 추적
- **rank 9**: QR 코드 + 시작 가이드 PDF — 친구 전달용

나머지 rank 2/3/5/6/7/10 은 친구 피드백 받으며 1-2주 내 점진 보강 가능.

**사용자 결정**: 4개 모두 구현 후 진입 vs 부분만 구현 후 진입. trade-off — 부분
진입 시 친구 피드백 수집 채널 없이 노출 → 사고 시 디버깅 자료 부족.

## 1. UAT Phase 1 Production Readiness 실행

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner

# 사전 — 3 계정 fresh + seed + invite
npm run uat:teardown
npm run uat:setup
npm run uat:seed
npm run uat:invite

# Stage D production server 검증 + start
npm run test:release   # 5 smoke 자동 통과 검증 (production build + start-server-and-test)

# 통과 후 production server 분리 유지
npm run build
npm run start:prod-test &   # localhost:3100 background

# 사본 생성
bash scripts/uat-new.sh phase1-prod
```

- [ ] `npm run test:release` 통과 (5 prod-smoke 자동)
- [ ] UAT 묶음 1 — Phase 1 코어 13 (owner 시점, 60분)
- [ ] UAT 묶음 2 — 권한 admin/member (40분, P1-PROD-2.1~2.3)
- [ ] UAT 묶음 3 — 데이터 복구 UI (40분, P1-PROD-3.1~3.3)
- [ ] UAT 묶음 4 — Multi-academy switch + isolation (30분, P1-PROD-4.1~4.2)
- [ ] UAT 묶음 5 — Production build 특수성 (30분, P1-PROD-5.1~5.5)
- [ ] UAT 묶음 6 — 학생/학부모 incognito (40분, §21)
- [ ] **All P0 Pass** (Phase 1 production release ready)
- [ ] UAT 결과 commit + PR 머지 (`runs/<DATE>-<COMMIT>-phase1-prod.md`)

## 2. 외부 서비스 secret 등록 (사용자 영역)

### 2.1 Sentry (rank 8)

```bash
# Sentry account 생성 (free tier 5K errors/월) → DSN 발급
# https://sentry.io/signup/ (이미 있으면 skip)

# GitHub Secret 등록
gh secret set SENTRY_DSN --body "https://...@sentry.io/..."

# Lightsail env 등록
ssh root@<lightsail-ip> "echo 'SENTRY_DSN=https://...' >> /opt/class-planner/.env.production && systemctl restart class-planner"
```

- [ ] Sentry account + project (Next.js)
- [ ] `SENTRY_DSN` GitHub secret 등록
- [ ] `SENTRY_DSN` Lightsail .env.production 등록
- [ ] `@sentry/nextjs` install + `sentry.client.config.ts` 작성
- [ ] 의도적 throw 로 capture 검증 (`/api/test-sentry` 1회 hit)

### 2.2 Plausible / Vercel Analytics (rank 4)

```bash
# Plausible self-host 옵션 (Mac Studio 활용 가능, dev-pack/docs/local-compute-resources.md 참조)
# 또는 cloud Plausible (월 $9 from 100k events)
```

- [ ] Analytics 서비스 결정 (Plausible cloud vs self-host vs Vercel Analytics)
- [ ] `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` GitHub secret + Lightsail env
- [ ] `<PlausibleProvider>` `app/layout.tsx` 통합
- [ ] pageview event production server 에서 도착 검증

### 2.3 QR 코드 + 시작 가이드 PDF (rank 9)

- [ ] `class-planner.info365.studio` 의 QR 코드 생성 (qr-code-generator)
- [ ] 시작 가이드 PDF 1장 작성 (Notion/Figma → PDF export)
  - 1단계: 로그인 (Google)
  - 2단계: 학원 생성
  - 3단계: 첫 시간표 작성
  - 4단계: PDF 출력
  - 5단계: 학부모 share

### 2.4 피드백 채널 (rank 1)

- [ ] Supabase 테이블 `feedback` 생성 (academy_id + user_id + body + screenshot_url + created_at)
- [ ] `/api/feedback` POST route
- [ ] Sidebar 하단 "피드백 보내기" 버튼 + 모달
- [ ] `/admin/feedback` 페이지 (owner-only) 로 조회

## 3. dev → main PR 작성

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner

# dev 최신 상태 확인
git switch dev
git pull --ff-only origin dev

# main 과 diff 확인
git log --oneline main..dev

# main 으로 switch + dev 머지 PR
git switch main
git pull --ff-only origin main
git switch -c chore/phase1-production-release

# 또는 dev 에서 직접 PR (dev → main)
gh pr create --base main --head dev --title "Phase 1 Production Release — friend pre-launch" --body "$(cat <<'EOF'
## Summary

Phase 1 production release 위한 dev → main 머지. 친구 학원 운영자(와이프 공동
운영) 선공개 = production deploy.

## Stage 완료 현황

- [x] Stage A: `/design-explorations/phase1-release-readiness` 페이지 신설 (이미 구현 13 / 부족 10 / 미래에서 이미 구현 3 + Roadmap + UAT + Production test)
- [x] Stage B: `monetization-strategy` fact 5곳 수정 (OAuth Google-only 명시 / 데이터 백업 UI 연결됨 / 권한 시스템 신규 항목 / PR 카운트 dynamic / SafetyNet currentImpl)
- [x] Stage D: `test:release` 인프라 (`tests/e2e/prod-smoke.spec.ts` + `start-server-and-test` + `docs/production-test-guide.md`)
- [x] Stage C: UAT `§22 Phase 1 Production Readiness Mode` 신설 (240분, 6 묶음, 9 신규 P0/P1)
- [x] Stage E: 본 PR (체크리스트 + 머지)

## Phase 1 구현 13 영역

시간표 / CRUD 3 / 출결 / PDF / share / invite / **데이터 복구 UI (settings)** / 강사 보관 / PWA / app_logs / **Google OAuth (Kakao 준비 중)** / 다중 academy 무제한 / **권한 시스템 owner-admin-member**

## 부족 Top 10 (선공개 후 점진 보강)

- 최소 권장 구현 (선공개 전): rank 1 (피드백 채널) + 4 (analytics) + 8 (Sentry) + 9 (QR 가이드)
- 점진 보강 (선공개 후 1-2주): rank 2 (about) / 3 (이 PR 자체) / 5 (onboarding) / 6 (발견성) / 7 (SEO) / 10 (데모 시드)

## UAT 결과

`tests/manual/runs/<DATE>-<COMMIT>-phase1-prod.md` — All P0 Pass (6 묶음 240분)

## 검증

- [x] `npm run check` 통과 (type-check + test + build)
- [x] `npm run test:release` 통과 (5 prod-smoke + production build)
- [x] UAT Phase 1 Production Readiness Mode All P0 Pass
- [x] dev 누적 PR review 완료
- [x] Sentry/Analytics secret production 등록

## Post-merge

- Lightsail 자동 deploy (`deploy.yml`)
- post-deploy smoke (production URL 5 critical paths)
- 친구 QR + 시작 가이드 PDF 전달
- 30-day 피드백 channel 활성 (Sidebar 피드백 버튼 monitor)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] dev → main PR 작성 (위 template)
- [ ] CI 통과 (`ci.yml` — check + build + e2e)
- [ ] dev → main 머지 (사용자 클릭)
- [ ] `deploy.yml` 자동 deploy → Lightsail 반영 확인

## 4. Post-deploy smoke (production URL)

```bash
# production URL (Lightsail) 에서 본 spec 직접 실행
PROD_BASE_URL=https://class-planner.info365.studio \
  npx playwright test --grep @prod-smoke --project=chromium --reporter=list
```

- [ ] Test 1 Health — 200 + title
- [ ] Test 2 Anonymous /schedule loads
- [ ] Test 3 /about renders
- [ ] Test 4 /login Google button enabled
- [ ] Test 5 Service Worker registered (production-only)

추가 수동 확인:
- [ ] DevTools → Application → Service Workers → "activated"
- [ ] Google OAuth 로그인 흐름 actual production 에서 1회
- [ ] Sentry dashboard 에 sample error 1건 capture 확인 (의도 throw)
- [ ] Analytics dashboard 에 본인 pageview 1건 도착 확인

## 5. 친구 전달

- [ ] QR 코드 + 시작 가이드 PDF 친구에게 카톡/이메일 전달
- [ ] 친구 첫 로그인 5분 내 도와주기 (필요 시 화면 share)
- [ ] 친구 학원/학생/시간표 첫 작성 함께 (Onboarding 안내)
- [ ] 30-day 피드백 channel monitor — 매일 1회 `/admin/feedback` 확인

## 6. Rollback 계획 (사고 발생 시)

```bash
# Lightsail 에 이전 image 복원
ssh root@<lightsail-ip> "docker pull ghcr.io/.../class-planner:<previous-tag> && docker stop class-planner && docker rm class-planner && docker run -d --name class-planner ..."

# 또는 git revert + 재머지
git revert <merge-commit-sha>
git push origin main
# → deploy.yml 자동 재배포
```

- [ ] 이전 production image tag 기록 (rollback 대비)
- [ ] Sentry 에서 사고 첫 30분 monitor
- [ ] critical bug 발견 시 rollback 결정 (사용자)

## 7. Phase 2 진입 조건 (Phase 1 완료 후)

`/design-explorations/monetization-strategy` 의 Phase 2 KPI 충족 시 진입:

- WAU 100+ 학원 (Plausible measurement)
- NPS 50+ (피드백 channel 분석)
- 친구 외 organic 신규 사용자 5+ (SEO + word-of-mouth)

진입 시 별도 `/design-explorations/phase2-monetization-readiness` 페이지 신설
패턴 (Phase 1 readiness 와 동일 구조).

## 관련 문서

- `/design-explorations/phase1-release-readiness/page.tsx` — Stage A-E SSOT
- `/design-explorations/monetization-strategy/page.tsx` — Phase 1-4 전략 mockup
- `docs/production-test-guide.md` — Stage D test:release 사용법
- `tests/manual/uat-checklist.md` §22 — UAT Phase 1 Production Readiness Mode
- `docs/strategy/monetization.md` — freemium 전략 SSOT
- `docs/strategy/data-roadmap.md` — 데이터 보관 4-Layer
- `docs/adr/022-monetization-freemium-strategy.md` — Phase Gate 결정
- `docs/adr/023-multi-academy-unlimited.md` — 다중 학원 무제한 패턴
