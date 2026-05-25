"use client";

import { useState, type ReactNode } from "react";
import {
  Camera,
  Crop,
  MousePointer,
  ScanLine,
  FileText,
  Check,
  X,
  AlertTriangle,
  Info,
} from "lucide-react";

// design-explorations: 피드백 캡쳐 UX 5 가지 대안 비교.
// 현재(A): getDisplayMedia 단일 viewport frame — 스크롤 영역 누락 + render race 위험.
// 사용자가 본인 브라우저로 각 variant 토글 + flow / pros-cons / 비교표 검토 후 결정.

type Variant = "A" | "B" | "C" | "D" | "E";

interface VariantMeta {
  id: Variant;
  title: string;
  oneLiner: string;
  icon: ReactNode;
  accent: string; // tailwind text-XXX
  flow: string[];
  pros: string[];
  cons: string[];
  effort: "S (~1d)" | "M (~3d)" | "L (~1w)";
  fitCase: string;
}

const VARIANTS: VariantMeta[] = [
  {
    id: "A",
    title: "현재 — Auto Viewport",
    oneLiner: "getDisplayMedia 단일 frame, 사용자 액션 없음",
    icon: <Camera size={18} />,
    accent: "text-slate-300",
    flow: [
      "피드백 버튼 클릭",
      "권한 팝업 '이 탭 공유' 자동 선택",
      "Modal 임시 숨김 후 viewport 단일 frame 캡쳐",
      "JPEG (quality 0.8) → 메시지 작성 → 전송",
    ],
    pros: [
      "단계 가장 적음 (4 step)",
      "외부 라이브러리 없음 (Browser native)",
      "html2canvas 의 CSS transform / fixed 부정확 문제 회피",
    ],
    cons: [
      "스크롤 영역(off-screen) 캡쳐 X",
      "캡쳐 = '캡쳐 시점 viewport' 1 frame — render race / data hydrate 미완 시 빈 cell",
      "사용자가 의도한 버그 영역과 다를 수 있음 (현재 스크롤 / 필터 상태 그대로)",
    ],
    effort: "S (~1d)",
    fitCase: "단순 페이지 / 짧은 dashboard. 시간표처럼 긴 스크롤 X.",
  },
  {
    id: "B",
    title: "드래그 영역 선택",
    oneLiner: "Snipping Tool 스타일 — 사용자가 마우스로 사각형 드래그",
    icon: <Crop size={18} />,
    accent: "text-amber-300",
    flow: [
      "피드백 버튼 클릭",
      "화면 전체 dim + '버그 영역 드래그하세요' 안내",
      "사용자가 영역 드래그 → 선택 영역 강조 (실시간)",
      "마우스 release → 자동 캡쳐 (선택 영역만)",
      "모달 + 미리보기 → 메시지 작성 → 전송",
    ],
    pros: [
      "사용자 의도 명확 (정확한 버그 위치)",
      "용량 작음 (선택 영역만)",
      "Windows 스니핑 / Mac Cmd+Shift+4 친숙도 높음",
      "권한 팝업 회피 가능 (DOM 캡쳐 + crop)",
    ],
    cons: [
      "단계 1개 추가 (드래그)",
      "drag overlay UI 자작 (Selection Box + dim layer)",
      "스크롤 아래 영역 캡쳐는 여전히 X (drag 영역이 viewport 한정)",
    ],
    effort: "M (~3d)",
    fitCase: "추천 — 캡쳐 정확도 + 학습 부담 균형",
  },
  {
    id: "C",
    title: "컴포넌트 픽커",
    oneLiner: "마우스 hover 시 DOM element 강조 → 클릭으로 자동 영역",
    icon: <MousePointer size={18} />,
    accent: "text-violet-300",
    flow: [
      "피드백 버튼 클릭",
      "모달 + '버그 컴포넌트를 클릭하세요' 안내",
      "Hover 시 element 외곽 + data-testid 강조",
      "클릭 → 그 element의 bounding rect 영역 캡쳐",
      "메타데이터 자동 첨부 (component name / props / data-testid) → 전송",
    ],
    pros: [
      "UI structure 따라 자동 영역 (사용자가 사각형 그릴 필요 X)",
      "메타데이터 풍부 (개발팀이 즉시 component 식별)",
      "버그 trace 비용 ↓",
    ],
    cons: [
      "사용자가 'element' 개념 학습 필요 (일반 학원 운영자에겐 부담)",
      "element 외부 영역 (여백 / 다른 panel 같이 보기) 캡쳐 X",
      "shadow DOM / iframe 일부 미지원",
    ],
    effort: "M (~3d)",
    fitCase: "개발팀 내부 dogfood / power user. 일반 사용자는 X.",
  },
  {
    id: "D",
    title: "자동 전체 페이지",
    oneLiner: "modern-screenshot 으로 scrollHeight 전체 DOM 캡쳐",
    icon: <ScanLine size={18} />,
    accent: "text-emerald-300",
    flow: [
      "피드백 버튼 클릭",
      "모달 + '전체 페이지 캡쳐 중...' progress 표시",
      "modern-screenshot 이 document.body scrollHeight 전체 렌더링",
      "캡쳐 완료 + thumbnail 미리보기 + crop 옵션",
      "메시지 작성 → 전송",
    ],
    pros: [
      "스크롤 영역 포함 (시간표 09:00-22:00 전부)",
      "사용자 액션 없음 (자동)",
      "권한 팝업 없음 (DOM 렌더링)",
      "캡쳐 시점 = DOM state 직접 → render race 위험 ↓",
    ],
    cons: [
      "라이브러리 ~80KB (modern-screenshot)",
      "CSS transform / fixed 일부 부정확 (단, modern-screenshot 은 html2canvas 보다 개선)",
      "대형 페이지 시 캡쳐 시간 1-3 초",
      "용량 큼 (500KB-2MB) — 현재 1MB cap 초과 위험 → resize/JPEG 로 압축 필요",
    ],
    effort: "M (~3d)",
    fitCase: "시간표처럼 긴 스크롤 영역 필요한 경우 1순위 — class-planner에 부합",
  },
  {
    id: "E",
    title: "스크린샷 생략",
    oneLiner: "텍스트 + 자동 메타 (URL / 학원 / 필터 / console log) 만",
    icon: <FileText size={18} />,
    accent: "text-sky-300",
    flow: [
      "피드백 버튼 클릭",
      "모달 열림 (캡쳐 없음)",
      "사용자가 메시지 작성",
      "자동 첨부: URL, academyId, activeView, 필터 상태, console.error last 50, localStorage size",
      "전송",
    ],
    pros: [
      "가장 빠름 (3 step)",
      "권한 팝업 없음 / 캡쳐 lib 없음",
      "용량 가장 작음 (<10KB)",
      "Privacy 친화 (시각 데이터 X)",
    ],
    cons: [
      "시각적 컨텍스트 손실 (개발팀이 화면 재현 어려움)",
      "버그 review 시간 ↑ (텍스트만 보고 재현)",
      "스타일 / 색상 버그 X (글로만 표현 한계)",
    ],
    effort: "S (~1d)",
    fitCase: "버그 분류가 단순 (text-only)일 때만. 시각 버그 X. 옵션으로 병행 가능.",
  },
];

const COMPARISON_ROWS: {
  metric: string;
  values: Record<Variant, string>;
}[] = [
  {
    metric: "캡쳐 정확도",
    values: { A: "낮음", B: "높음 ✓", C: "높음 ✓", D: "최고 ✓", E: "—" },
  },
  {
    metric: "스크롤 영역 포함",
    values: { A: "X", B: "X (viewport 한정)", C: "△ (element 안)", D: "✓", E: "—" },
  },
  {
    metric: "Render race 위험",
    values: { A: "있음", B: "있음", C: "낮음", D: "낮음 (DOM 직접)", E: "—" },
  },
  {
    metric: "UX 단계 수",
    values: { A: "4", B: "5", C: "5", D: "5", E: "3" },
  },
  {
    metric: "권한 팝업",
    values: { A: "있음", B: "있음 (회피 가능)", C: "없음", D: "없음", E: "없음" },
  },
  {
    metric: "용량 (avg)",
    values: { A: "200KB", B: "50-100KB", C: "100-300KB", D: "500KB-2MB", E: "<10KB" },
  },
  {
    metric: "추가 라이브러리",
    values: {
      A: "없음",
      B: "없음 (drag overlay 자작)",
      C: "없음 (overlay 자작)",
      D: "modern-screenshot (~80KB)",
      E: "없음",
    },
  },
  {
    metric: "구현 비용",
    values: { A: "—", B: "M (~3d)", C: "M (~3d)", D: "M (~3d)", E: "S (~1d)" },
  },
  {
    metric: "사용자 학습 부담",
    values: { A: "없음", B: "낮음", C: "중간", D: "없음", E: "없음" },
  },
];

function VariantTab({
  meta,
  active,
  onClick,
}: {
  meta: VariantMeta;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 px-4 py-3 rounded-lg border transition-all text-left flex-1 min-w-0 ${
        active
          ? "border-amber-400 bg-amber-400/10"
          : "border-slate-700 bg-slate-900/50 hover:border-slate-500"
      }`}
    >
      <div className={`flex items-center gap-2 ${meta.accent}`}>
        {meta.icon}
        <span className="text-xs font-semibold opacity-70">변형 {meta.id}</span>
      </div>
      <div className="text-sm font-semibold text-slate-100 truncate w-full">
        {meta.title}
      </div>
      <div className="text-[11px] text-slate-400 line-clamp-2">{meta.oneLiner}</div>
    </button>
  );
}

function VariantDetail({ meta }: { meta: VariantMeta }) {
  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* UX flow */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span className={meta.accent}>{meta.icon}</span>
          UX Flow
        </h3>
        <ol className="space-y-2 text-xs text-slate-300">
          {meta.flow.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span
                className={`flex-shrink-0 w-5 h-5 rounded-full ${meta.accent} bg-slate-800 inline-flex items-center justify-center text-[10px] font-bold`}
              >
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Pros */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-emerald-300 mb-3 flex items-center gap-2">
          <Check size={16} /> Pros
        </h3>
        <ul className="space-y-2 text-xs text-slate-300">
          {meta.pros.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-emerald-400 flex-shrink-0">✓</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Cons */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-rose-300 mb-3 flex items-center gap-2">
          <X size={16} /> Cons
        </h3>
        <ul className="space-y-2 text-xs text-slate-300">
          {meta.cons.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-rose-400 flex-shrink-0">✗</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Effort + Fit */}
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
            구현 비용
          </div>
          <div className="text-sm font-semibold text-slate-100">{meta.effort}</div>
        </div>
        <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
            적합 케이스
          </div>
          <div className="text-sm text-slate-200">{meta.fitCase}</div>
        </div>
      </div>
    </div>
  );
}

function ComparisonTable() {
  return (
    <div className="overflow-x-auto bg-slate-900/30 border border-slate-800 rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left p-3 text-slate-400 font-medium">지표</th>
            {VARIANTS.map((v) => (
              <th
                key={v.id}
                className="text-center p-3 text-slate-200 font-semibold"
              >
                <div className="text-[10px] opacity-50">변형 {v.id}</div>
                <div className="mt-1">{v.title.split(" — ").pop()}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row, i) => (
            <tr
              key={row.metric}
              className={
                i % 2 === 0 ? "bg-slate-900/20" : "bg-transparent"
              }
            >
              <td className="p-3 text-slate-300 font-medium">{row.metric}</td>
              {VARIANTS.map((v) => (
                <td
                  key={v.id}
                  className="p-3 text-center text-slate-200 whitespace-nowrap"
                >
                  {row.values[v.id]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CurrentProblem() {
  return (
    <div className="mt-6 bg-rose-950/30 border border-rose-900/50 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-rose-400 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1 space-y-2 text-sm">
          <div className="font-semibold text-rose-200">
            현재 구현 (변형 A) 의 관측된 증상
          </div>
          <div className="text-slate-300 text-xs leading-relaxed">
            <code className="text-amber-300 bg-slate-900 px-1 rounded">
              FeedbackModal.tsx:74-156
            </code>{" "}
            의{" "}
            <code className="text-amber-300 bg-slate-900 px-1 rounded">
              getDisplayMedia({"{"} preferCurrentTab: true {"}"})
            </code>{" "}
            가 단일 viewport frame 만 캡쳐 →{" "}
            <strong className="text-rose-200">스크롤 영역 누락</strong> +
            캡쳐 시점에 데이터 hydrate 미완 시{" "}
            <strong className="text-rose-200">
              카드 일부 / 색상 일부 빈 상태 캡쳐
            </strong>{" "}
            (사용자 제보 Image 1 vs Image 2 비교).
          </div>
          <div className="text-slate-400 text-[11px]">
            가능성 1: viewport 외부 카드 캡쳐 X. 가능성 2: getDisplayMedia 가
            video stream 의 첫 frame 을 잡는 시점이 React state hydration 보다
            빠름 (race). 가능성 3: Modal 임시 숨김 trigger 의 visibility:hidden
            transition 중 캡쳐.
          </div>
        </div>
      </div>
    </div>
  );
}

function Recommendation() {
  return (
    <div className="mt-12 bg-emerald-950/20 border border-emerald-900/50 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <Info className="text-emerald-400 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1 space-y-3 text-sm">
          <div className="font-semibold text-emerald-200">최종 추천</div>
          <div className="text-slate-300 text-xs leading-relaxed">
            <strong className="text-emerald-300">변형 D (자동 전체 페이지)</strong>{" "}
            + 변형 B 옵션 병행. 이유:
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300 list-disc ml-5">
            <li>
              class-planner 의 핵심 화면(시간표)이 09:00-22:00 의 긴 스크롤 →
              viewport 한정 캡쳐로는 컨텍스트 손실 명백
            </li>
            <li>
              modern-screenshot 은 DOM 직접 캡쳐라 권한 팝업 + render race 둘 다
              회피
            </li>
            <li>
              용량 우려는 JPEG 압축 (quality 0.6) + max-width 1600px resize 로
              현재 1MB cap 안에 들어옴
            </li>
            <li>
              "변형 B 옵션"으로 fallback — 사용자가 특정 영역만 강조하고 싶을 때
              picker 모드 토글
            </li>
          </ul>
          <div className="mt-3 pt-3 border-t border-emerald-900/30 text-[11px] text-slate-400">
            대체안: <strong>B 단독</strong> — 구현 비용 동일하나 스크롤 영역
            여전히 X. <strong>C</strong> 는 학원 운영자 학습 부담으로 비추.{" "}
            <strong>E</strong> 는 D 와 병행 옵션 (캡쳐 거부 시 fallback).
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackScreenshotUxPage() {
  const [active, setActive] = useState<Variant>("D");
  const activeMeta = VARIANTS.find((v) => v.id === active)!;

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <header>
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            design-explorations / feedback-screenshot-ux
          </div>
          <h1 className="text-3xl font-bold text-slate-100">
            피드백 스크린샷 캡쳐 UX — 5 가지 대안 비교
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-3xl">
            사이드바 "피드백 보내기" 버튼이 현재{" "}
            <code className="text-amber-300">getDisplayMedia()</code> 로 viewport
            단일 frame 만 캡쳐. 시간표처럼 긴 스크롤 영역에서 누락 / render race
            발생. 5 가지 대안을 비교 후 결정.
          </p>
        </header>

        <CurrentProblem />

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-100 mb-1">
            5 가지 대안
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            탭을 클릭해 각 변형의 UX flow / pros-cons / 구현 비용 비교
          </p>
          <div className="flex flex-wrap gap-2">
            {VARIANTS.map((v) => (
              <VariantTab
                key={v.id}
                meta={v}
                active={active === v.id}
                onClick={() => setActive(v.id)}
              />
            ))}
          </div>
          <VariantDetail meta={activeMeta} />
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">
            전체 비교표
          </h2>
          <ComparisonTable />
        </section>

        <Recommendation />

        <footer className="mt-12 pt-6 border-t border-slate-800 text-[11px] text-slate-500">
          design-explorations: mockup 라우트 (production middleware 차단).
          비교 후 선호 변형을 알려주면 PR 생성.
          관련 코드: <code className="text-slate-400">src/components/molecules/FeedbackModal.tsx</code> (캡쳐),
          {" "}<code className="text-slate-400">src/components/molecules/Sidebar.tsx:374-395</code> (버튼)
        </footer>
      </div>
    </main>
  );
}
