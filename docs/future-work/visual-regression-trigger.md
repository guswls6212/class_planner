# Visual Regression Testing — 도입 트리거 & 단계별 옵션

**작성일:** 2026-05-04
**현재 상태:** Storybook 도입 진행 (PR #212 예정). Visual regression(픽셀 diff)은 미도입.

## 배경

class-planner는 현재 시각 회귀(visual regression)를 검증하지 않는다. e2e/Playwright는 DOM 존재만 검증하므로, 색상/spacing/폰트 등 시각적 변경은 사람 눈으로만 잡힌다. 그럼에도 디자인이 잘 안 깨진 이유:

1. **Design token (CSS 변수) 사용** — `--color-primary` 등으로 일관성 자동 유지
2. **Tailwind inline 클래스 사용** — `bg-amber-50 p-3` 식이라 PR diff에 시각 변경이 코드로 명확히 보임
3. **컴포넌트 ~50개 + 1인 개발** — 한 사람 머릿속에서 일관성 유지 가능

이 보호막이 깨지기 시작하면 visual regression 도구가 필요하다.

## 도입 트리거 (하나라도 켜지면 검토)

| # | 트리거 | 임계치 | 왜 그때 필요한가 |
|---|---|---|---|
| 1 | 컴포넌트 수 증가 | atoms+molecules+organisms 합쳐 **100개 이상** | 한 사람 머릿속 추적 한계 초과. PR마다 "이거 바꾸면 어디 영향?" 추적 불가 |
| 2 | 공동 개발 | 디자이너 또는 다른 개발자 **1명 이상 합류** | 의도되지 않은 시각 영향이 자주 발생. 의사소통 비용 ↑ |
| 3 | Hardcoded 색상/spacing 비중 | `bg-[#XXXXXX]` 같은 직접 박힌 hex가 **20곳 이상** | design token의 자동 일관성 무력화. 한 곳 바꿀 때 누락 위험 |
| 4 | Tailwind config 자주 수정 | `theme.colors`/`theme.spacing` 변경이 **분기당 2회 이상** | 한 줄 변경이 50+ 컴포넌트에 영향. 사람 검수 한계 |
| 5 | CSS-in-JS or 글로벌 CSS 비중 ↑ | `globals.css` 또는 styled-components로 박힌 cascade 룰이 **50줄 이상** | cascade 영향 광범위. 어디까지 도달했는지 추적 불가 |
| 6 | 디자인 시스템 v2 마이그레이션 | "Button v1 → v2" 같은 일괄 변경 1회 이상 | 영향 범위가 너무 커서 수동 검수 위험. 회귀 가능성 ↑ |
| 7 | 반응형 breakpoint 증가 | sm/md/lg/xl 외 추가 breakpoint 또는 viewport 차이 별 다른 디자인 | viewport마다 사람 눈으로 다 검수 불가능 |

**Claude의 알림 의무:** 위 트리거가 트리거되었음을 감지하면 (예: 컴포넌트 추가 PR 리뷰 시 100개 도달 인지, 디자이너 합류 발화 인지), 사용자에게 "Visual regression 도입 시점 도래" 알림을 자발적으로 한다.

## 단계별 도입 옵션

### Stage 0 — 현재 (도입 X)
사람 눈 + 코드 리뷰 + 단위 테스트 + e2e DOM 검증. 1인 + 디자인 안정 단계 충분.

### Stage 1 — Storybook (이번 PR에서 도입)
**목적:** 격리 환경 — auth/state 의존 없이 컴포넌트만 띄워 시각 검증.
**비용:** OSS 무료. 셋업 1-2시간, 컴포넌트당 story 작성 5-15분.
**가치:** "모달 한 줄 바꾸려고 schedule 전체 띄울 필요 없음." Today's pain (auth session 시뮬레이션 불가) 해결.

### Stage 2 — Storybook + Playwright `toHaveScreenshot` (트리거 1+ 개 발생 시)
**목적:** Storybook의 격리 환경 + 자체 visual regression. baseline PNG를 git에 commit.
**비용:** 0원. 운영 부담 보통.
**Mac Studio M3 Ultra 활용:**
- baseline 생성을 Mac Studio에서 직접 (CI Linux와 OS 차이 우회: Docker로 동일 이미지 배포 또는 Mac CI runner 사용)
- 512GB RAM으로 stories 수백 개 병렬 캡쳐 부담 없음
- 자체 호스팅하는 시각 diff 뷰어(예: [Lost Pixel OSS](https://lost-pixel.com/), [Reg-Suit](https://github.com/reg-viz/reg-suit))를 로컬에서 운영 → cloud 비용 0원

**함정:**
- macOS dev ↔ Linux CI 폰트 anti-aliasing 차이 → false positive. **Docker로 baseline 생성 강제**.
- baseline PNG가 PR diff에 섞임 → 코드 리뷰 가독성 저하.
- threshold 튜닝 노가다.

### Stage 3 — Chromatic (조직 커지고 approval workflow 필요 시)
**목적:** Stage 2 + 웹 UI(diff 시각화 + 한 버튼 approve) + cloud baseline 관리.
**비용:** 월 5,000 스냅샷 무료. 그 이상 유료(개인 플랜 ~$149/월부터).
**Mac Studio 대안 검토:** Chromatic의 핵심은 cloud 운영 편의성이지 compute가 아님. Mac Studio가 직접 대체하긴 어렵지만, **self-host visual regression 운영을 Mac Studio가 부담 없이 감당 가능**하다는 점에서 Chromatic 도입 동기가 약화됨. 즉 "Stage 2를 Mac Studio + OSS 도구로 끝까지 운영"이 현실적 선택.

## Mac Studio M3 Ultra 활용을 전제로 한 Long-term 권장

| 작업 | Cloud 옵션 | Mac Studio Self-host 옵션 |
|---|---|---|
| Visual regression baseline | Chromatic ($149/월~) | Lost Pixel/Reg-Suit OSS + Docker (0원) |
| E2E 병렬 실행 | GitHub Actions 분당 과금 | Mac Studio runner (자체 GitHub self-hosted runner) |
| 컴포넌트 검수용 Storybook 호스팅 | Vercel/Chromatic | nginx + Mac Studio 24/7 (집 IP 또는 Tailscale) |
| 디자인 시스템 토큰 일관성 검사 | Style Dictionary cloud | Style Dictionary local + git pre-push hook |

## 액션 아이템 (현재)

- [x] Storybook 도입 (Stage 1) — PR #212에서 진행
- [ ] 분기당 1회 트리거 점검 — 컴포넌트 수, hardcoded 색상 grep, 공동 개발 여부
- [ ] 트리거 1+ 발생 시 Stage 2 도입 검토 — Lost Pixel OSS 또는 Reg-Suit 비교 ADR 작성

## 트리거 점검 명령어

```bash
# 컴포넌트 수 (atoms + molecules + organisms)
find src/components -name "*.tsx" -not -path "*__tests__*" -not -name "*.stories.tsx" | wc -l

# Hardcoded hex 색상 grep (Tailwind arbitrary value)
grep -rE 'bg-\[#|text-\[#|border-\[#' src/ | wc -l

# Tailwind config 변경 빈도 (지난 90일)
git log --since="90 days ago" --oneline -- tailwind.config.* | wc -l
```

100, 20, 2 임계치 도달 시 본 문서의 Stage 2 검토.
