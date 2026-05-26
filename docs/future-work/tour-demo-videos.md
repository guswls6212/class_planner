# InlineTour 데모 영상 — Future Work 정리

> **상태**: 정리만 (production release 후 진행 예정)
> **사용자 명시 (2026-05-26)**: "데모영상옵션은 production release후에 하는걸로 하고 어떤 영상있으면 좋을지만 정리해두면 좋을듯"
> **연관**: `internal-dashboard /strategy/onboarding-walkthrough` + `class-planner/src/lib/tour-steps.ts` (rank 5-A)

## 1. 어떤 영상이 있으면 좋을지 (step 별)

InlineTour 6 step 중 **시각 인터랙션이 핵심인 step** 에 데모 영상 도입 검토.

| step | 영상 필요도 | 영상 후보 | 우선순위 |
|---|---|---|---|
| 1. 학생 등록 | ★★ | 학생 추가 버튼 → 모달 → 입력 → 저장 (~5초) | 낮음 |
| 2. 과목 등록 | ★ | 과목 추가 → 색상 선택 (~3초) | 낮음 |
| 3. 강사 등록 | ★★ | 강사 추가 모달 (강사-원장 중복 처리 포함) | 낮음 |
| 4. 시간표 만드는 곳 | ★★ | 수업 추가 모달 → 학생/과목/시간 → 저장 → 블록 등록 (~10초) | 중간 |
| **5. 수업 블록 이동** | **★★★★★** | **마우스 오버 → 왼쪽 위 드래그 아이콘 노출 → 끌어 다른 시간으로 이동 → drop → 그룹화 (~8초)** | **가장 높음** (사용자 명시) |
| 6. PDF 인쇄 | ★★ | PDF 버튼 클릭 → 미리보기 → 다운로드 (~5초) | 낮음 |

**핵심 영상 1개**: Step 5 (수업 블록 이동) — 사용자 verify (2026-05-26) 명시 "라이브로 보여주게끔 하고싶음. 그래야 더 이해가 잘될거라생각함. 동영상을 위에 씌워서 반복적으로 보여주게 해야하나?"

## 2. Production 옵션 비교

| 옵션 | 분량 (1 영상) | 파일 크기 | 장점 | 단점 |
|---|---|---|---|---|
| **A. CSS pure animation** | 0.5-1일 (mock element + transform) | 0 (코드만) | 의존성 0, retina/모바일 깨끗, 무한 loop 자연 | mock UI 와 실 UI 일치 신경. drag 동작 추상화 |
| **B. Lottie animation** | 1-2일 (lottie json 작성 or 디자이너 outsourcing) | ~10-30KB | 부드러움, vector, lottie-react 표준 lib | json 작성 시간 + lib 추가 (의존성 +20KB) |
| **C. mp4/webm video (실제 화면 캡처)** | 0.3-0.5일 (OBS/QuickTime + ffmpeg 압축) | 100KB-1MB (8초 기준) | 가장 현실적 — 실제 UI 그대로. 학습 효과 ↑ | 파일 크기, dark/light theme 대응 시 2개 필요 |
| **D. GIF (autoplay loop)** | 0.2-0.3일 (캡처 + giphy/ezgif 변환) | 200-500KB | 단순, autoplay loop 기본, HTML `<img>` 만 | 색상 256, 크기 큼 (mp4 대비), retina 안 됨 |

**추천**:
- **1차 (production release 직후)**: **옵션 C (mp4/webm)** — Step 5 만 1개 영상. 8초 short loop. 실제 UI 그대로 → 학습 효과 가장 높음.
- **2차 (확장 시)**: 옵션 A (CSS animation) — Step 1/2/3/4/6 같은 단순 인터랙션 추가 (분량 낮고 의존성 0).

## 3. 영상 자산 위치 / 관리

```
class-planner/
  public/
    tour/
      step-5-block-drag.webm           # Step 5 데모 (primary)
      step-5-block-drag-light.webm     # Light theme 변형 (선택)
      step-1-student-add.webm          # 2차 확장 시
      ...
```

### tour-steps.ts 확장 시 시그니처

```ts
interface TourStep {
  id: string;
  targetSelector: string;
  targetPath?: string;
  title: string;
  description: string;
  placement?: TourPlacement;
  // 신규 (future)
  demoVideo?: {
    src: string;        // /tour/step-5-block-drag.webm
    poster?: string;    // 첫 frame thumbnail
    loop?: boolean;     // default true
    width?: number;     // default 280
    height?: number;    // default auto
  };
}
```

### InlineTour 컴포넌트 확장 시 위치

tooltip 본문 description 위에 `<video>` 임베드:
```tsx
{tour.step.demoVideo && (
  <video
    src={tour.step.demoVideo.src}
    poster={tour.step.demoVideo.poster}
    autoPlay
    loop={tour.step.demoVideo.loop ?? true}
    muted
    playsInline
    width={tour.step.demoVideo.width ?? 280}
    className="rounded-md border border-white/10 mb-2"
  />
)}
```

`autoPlay + muted + playsInline` 조합 — 모바일 Safari 도 autoplay 허용.

## 4. 영상 capture/production 절차 (옵션 C 기준)

### Step 5 시연 영상 production checklist

1. **준비**:
   - class-planner 본체 dev server `:3000` 시작
   - 시드 데이터: 학생 3명 + 과목 2개 + 강사 1명 + 시간표에 sample session 1개 (월요일 10:00) 등록
   - dark theme + 1920×1080 또는 1440×900 viewport (retina 시 2x)

2. **캡처**:
   - QuickTime "화면 기록" 또는 OBS Studio
   - 시간표 영역만 cropping → 마우스 오버 → 드래그 아이콘 → 다른 시간 drop 까지 8초
   - cursor 강조 (Mac: System Settings → Accessibility → Display → Pointer size 약간 ↑)

3. **편집 + 압축**:
   - ffmpeg: `ffmpeg -i input.mov -vf "crop=W:H:X:Y,scale=560:-2" -c:v libvpx-vp9 -b:v 300k -row-mt 1 -an step-5-block-drag.webm`
   - 목표: 500KB 이내, 8초, 30fps
   - mp4 fallback (Safari iOS 일부 webm 미지원): `ffmpeg -i input.mov -c:v libx264 -crf 28 -preset slow -an step-5-block-drag.mp4`

4. **검증**:
   - `<video>` 임베드 → autoplay loop 동작 확인
   - 모바일 viewport (375×667) 시 width 조정
   - Chrome/Safari/Firefox 모두 확인

## 5. 본 정리 외 follow-up

- 본 docs 는 production release 후 진입 시 reference
- proposal 진입 시 `dev-pack/proposed-tasks/class-planner/tour-demo-videos.md` 신규 작성 (status: proposed)
- 사용자 본 release 일정 결정 후 trigger
- 데이터 시드 (학생/과목/강사/sample session) 가 항상 필요 — `tests/manual/uat-helpers` 의 seed script 활용 가능

## 6. References

- `internal-dashboard /strategy/onboarding-walkthrough` § Part A — InlineTour 5 step (현재 6 step, 사용자 verify 후 갱신)
- `class-planner/src/lib/tour-steps.ts` — TOUR_STEPS 정의 (확장 시 demoVideo field)
- `class-planner/src/components/molecules/InlineTour.tsx` — `<video>` 임베드 위치 (description 위)
- `class-planner/proposed-tasks/ad-video-production.md` (`dev-pack/proposed-tasks/class-planner/ad-video-production.md`) — 광고 영상 별도 (Phase 2 진입 시 채택). 본 docs 와 다른 채널 (광고 conversion vs onboarding 학습).
- 사용자 verify 피드백 2026-05-26: "데모영상옵션은 production release후에 하는걸로 하고 어떤 영상있으면 좋을지만 정리해두면 좋을듯"
