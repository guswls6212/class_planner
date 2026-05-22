/**
 * PdfExportRangeModal 필터 명시 디자인 비교 — design exploration.
 *
 * 문제 (UAT 2026-05-22):
 * 1. 필터 적용 상태에서 "현재 뷰만 출력" 의 의미 불명확
 * 2. preflight warning 이 displaySessions (dim 포함) 기준 → 전체처럼 보임
 *
 * 5 variant 비교 — 사용자가 본인 브라우저에서 시각 비교 후 선택.
 * URL: http://localhost:3000/design-explorations/pdf-modal-filter
 */
export default function PdfModalFilterDesignExplorations() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="max-w-7xl mx-auto mb-8">
        <h1 className="text-2xl font-bold text-amber-300 mb-2">
          PdfExportRangeModal — 필터 명시 디자인 비교
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl">
          문제: 필터 chip 활성 (예: 국어 과목) 시 "현재 뷰만 출력" = 필터된 12 sessions
          만 인쇄. 그러나 modal 에 명시 없음 + preflight warning (월요일 4건 / 목요일 5건
          / 출력 범위 15h) 이 전체 32 sessions 기준처럼 보여 혼란.
        </p>
        <p className="text-sm text-slate-500 mt-2">
          예시 데이터: 전체 32 sessions / 필터 적용 (국어) 후 12 sessions / 강사
          2명·학생 5명 출현.
        </p>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <VariantA />
        <VariantB />
        <VariantC />
        <VariantD />
        <VariantE />
        <Decision />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Variant A — Minimal: 라디오 라벨에 sub text 만 추가
// ─────────────────────────────────────────────────────────────────────
function VariantA() {
  return (
    <Card title="A. Minimal — 라디오 sub label" pros="변화 최소, 시각 noise X" cons="작은 텍스트 — 인지 약함">
      <Modal>
        <H3>PDF 출력 범위</H3>
        <Warning sessionCount={12} note="필터 적용 12 sessions 기준" />
        <RadioRow checked label="현재 뷰만 출력" sub="필터 적용 — 국어 12 sessions" />
        <RadioRow label="여러 주 범위 출력" />
        <RadioRow label="강사별로 1장씩" sub="강사 수만큼 파일 다운로드" />
        <RadioRow label="학생별로 1장씩" sub="학생 수만큼 파일 다운로드" />
        <Footer />
      </Modal>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Variant B — 상단 Filter Banner
// ─────────────────────────────────────────────────────────────────────
function VariantB() {
  return (
    <Card title="B. Filter Banner — 상단 명시" pros="필터 상태 즉시 인지" cons="modal 높이 +">
      <Modal>
        <H3>PDF 출력 범위</H3>
        <div className="mb-3 rounded-md bg-amber-500/10 border border-amber-500/40 px-3 py-2 text-xs text-amber-300 flex items-center gap-2">
          <span>🎯</span>
          <span>
            <b>필터 적용 중</b> — 국어 과목 · 표시 sessions{" "}
            <b>12 / 전체 32</b>
          </span>
        </div>
        <Warning sessionCount={12} />
        <RadioRow checked label="현재 뷰만 출력" />
        <RadioRow label="여러 주 범위 출력" />
        <RadioRow label="강사별로 1장씩" />
        <RadioRow label="학생별로 1장씩" />
        <Footer />
      </Modal>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Variant C — 명시적 양분 라디오 (인쇄 대상 + 출력 형식 그룹)
// ─────────────────────────────────────────────────────────────────────
function VariantC() {
  return (
    <Card
      title="C. 양분 라디오 — 인쇄 대상 / 출력 형식 분리"
      pros="가장 명확. 사용자 선택권 명시"
      cons="라디오 수 ↑. modal 높이 +. 결정 부담"
    >
      <Modal>
        <H3>PDF 출력 범위</H3>

        <SubH>인쇄 대상</SubH>
        <RadioRow checked label="필터 적용 sessions만" sub="국어 12 sessions" />
        <RadioRow label="전체 sessions" sub="필터 무시 — 32 sessions" />

        <SubH className="mt-3">출력 형식</SubH>
        <Warning sessionCount={12} compact />
        <RadioRow checked label="현재 뷰만 (1주)" />
        <RadioRow label="여러 주 범위" />
        <RadioRow label="강사별로 1장씩" />
        <RadioRow label="학생별로 1장씩" />

        <Footer />
      </Modal>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Variant D — Filter Chip + 토글 가능
// ─────────────────────────────────────────────────────────────────────
function VariantD() {
  return (
    <Card
      title="D. Filter Chip + 토글"
      pros="필터 ON/OFF 토글 명시. 한 눈에 인지"
      cons="필터 chip 클릭 의도 불명확 가능"
    >
      <Modal>
        <div className="flex items-center justify-between mb-3">
          <H3 inline>PDF 출력 범위</H3>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400">필터:</span>
            <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
              국어
              <span className="text-amber-400">×</span>
            </button>
            <span className="text-slate-500 ml-1">12 / 32</span>
          </div>
        </div>
        <Warning sessionCount={12} />
        <RadioRow checked label="현재 뷰만 출력" />
        <RadioRow label="여러 주 범위 출력" />
        <RadioRow label="강사별로 1장씩" />
        <RadioRow label="학생별로 1장씩" />
        <Footer />
      </Modal>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Variant E — Mini Preview Thumbnail (좌측 thumbnail + 우측 옵션)
// ─────────────────────────────────────────────────────────────────────
function VariantE() {
  return (
    <Card
      title="E. Mini Preview — 좌측 thumbnail"
      pros="시각 직관. 인쇄 결과 즉시 확인"
      cons="modal 가로 +. preview 렌더 cost"
    >
      <Modal wide>
        <H3>PDF 출력 범위</H3>
        <div className="grid grid-cols-[120px_1fr] gap-3">
          <div>
            <div className="text-[10px] text-slate-400 mb-1">미리보기 (12 sessions)</div>
            <div className="aspect-[210/297] bg-white rounded border border-slate-700 p-1.5 text-[5px] text-slate-800 overflow-hidden">
              <div className="font-bold mb-0.5">윤멘토 시간표</div>
              <div className="grid grid-cols-7 gap-px text-[3px]">
                {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                  <div key={d} className="text-center text-slate-500">
                    {d}
                  </div>
                ))}
                <div className="bg-cyan-200 rounded-sm p-px col-span-1">국어 10시</div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} />
                ))}
                <div className="bg-cyan-200 rounded-sm p-px col-span-1">국어 16시</div>
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} />
                ))}
                <div className="bg-cyan-200 rounded-sm p-px col-span-1">국어 16시</div>
              </div>
            </div>
            <div className="text-[10px] text-amber-400 mt-1">필터: 국어</div>
          </div>
          <div>
            <Warning sessionCount={12} compact />
            <RadioRow checked label="현재 뷰만 출력" />
            <RadioRow label="여러 주 범위 출력" />
            <RadioRow label="강사별로 1장씩" />
            <RadioRow label="학생별로 1장씩" />
            <Footer />
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function Decision() {
  return (
    <div className="bg-slate-900 rounded-lg p-5 border border-slate-700">
      <h3 className="text-lg font-bold text-amber-300 mb-3">결정 가이드</h3>
      <div className="space-y-3 text-sm">
        <Row name="A. Minimal">
          가장 변화 작음. 빠른 적용. <b>인지 약함</b>이 단점.
        </Row>
        <Row name="B. Filter Banner">
          상단 banner — <b>한 눈에 인지</b>. 사용자가 modal 진입 시 즉시 필터 상태
          확인. 균형 잡힌 후보.
        </Row>
        <Row name="C. 양분 라디오">
          가장 <b>명확</b> + 사용자 선택권. modal 높이 +, 결정 부담. 필터 무시
          출력 옵션 가치 있으면 채택.
        </Row>
        <Row name="D. Filter Chip + 토글">
          <b>compact + 토글 명시</b>. chip "×" 클릭 = 필터 해제. 익숙한 패턴.
        </Row>
        <Row name="E. Mini Preview">
          시각 검증. preview 렌더 cost + modal 가로 ↑. <b>가장 sophisticated</b>
          이지만 무거움.
        </Row>
        <div className="border-t border-slate-700 pt-3 mt-3">
          <div className="text-amber-300 font-semibold">추천</div>
          <div className="text-slate-300 mt-1">
            <b>B (Banner)</b> 또는 <b>D (Chip + 토글)</b> — 빠른 적용 + 명확.{" "}
            <br />
            전체 출력 옵션 필요 시 <b>C (양분 라디오)</b>.
          </div>
          <div className="text-slate-500 text-xs mt-2">
            모든 variant 공통: preflight warning 카운트 명시 ("12 sessions 기준") +{" "}
            preflightCheck 호출이 필터된 sessions 기준이 되도록 schedule/page.tsx 의
            pdfPreflightResult 갱신.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Shared mockup pieces
// ─────────────────────────────────────────────────────────────────────
function Card({
  title,
  pros,
  cons,
  children,
}: {
  title: string;
  pros: string;
  cons: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
      <h3 className="text-base font-semibold text-amber-200 mb-3">{title}</h3>
      <div className="mb-3">{children}</div>
      <div className="text-xs space-y-1 mt-3">
        <div className="text-emerald-400">✓ {pros}</div>
        <div className="text-rose-400">⚠ {cons}</div>
      </div>
    </div>
  );
}

function Modal({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-600 ${wide ? "" : "max-w-md"}`}
    >
      {children}
    </div>
  );
}

function H3({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <h3
      className={`text-base font-semibold text-slate-100 ${inline ? "" : "mb-3"}`}
    >
      {children}
    </h3>
  );
}

function SubH({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-xs font-medium text-slate-300 uppercase tracking-wide mb-1.5 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function Warning({
  sessionCount,
  note,
  compact,
}: {
  sessionCount: number;
  note?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-md border border-amber-400/40 bg-amber-500/10 ${compact ? "p-2 mb-2" : "p-2.5 mb-3"} text-[11px]`}
    >
      <div className="font-medium text-amber-300 mb-1">
        ⚠ 출력 시 확인 <span className="text-amber-400/70">({sessionCount} sessions 기준)</span>
      </div>
      <ul className="space-y-0.5 text-amber-300/80">
        <li>• 월요일에 동시 진행 4건 — 강사별 분할을 권장합니다</li>
        <li>• 목요일에 동시 진행 5건 — 강사별 분할을 권장합니다</li>
        <li>• 출력 범위 15시간 — 1시간 수업의 학생 이름이 잘릴 수 있어요</li>
      </ul>
      {note && <div className="text-amber-400/70 text-[10px] mt-1">{note}</div>}
      <button className="mt-1.5 text-[10px] text-amber-200 underline">
        강사별 분할로 전환
      </button>
    </div>
  );
}

function RadioRow({
  label,
  sub,
  checked,
}: {
  label: string;
  sub?: string;
  checked?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer py-1">
      <input
        type="radio"
        defaultChecked={checked}
        className="mt-0.5"
        readOnly
      />
      <div className="text-sm">
        <span className="text-slate-100">{label}</span>
        {sub && <span className="text-xs text-slate-400 block">{sub}</span>}
      </div>
    </label>
  );
}

function Footer() {
  return (
    <div className="flex gap-2 justify-end mt-3">
      <button className="px-3 py-1.5 rounded border border-slate-600 text-xs text-slate-300">
        취소
      </button>
      <button className="px-3 py-1.5 rounded bg-amber-500 text-xs text-white font-medium">
        출력
      </button>
    </div>
  );
}

function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-amber-200 font-medium">{name}:</span>{" "}
      <span className="text-slate-300">{children}</span>
    </div>
  );
}
