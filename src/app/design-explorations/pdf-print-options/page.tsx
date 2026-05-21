"use client";

/**
 * design-explorations: PDF 인쇄 디자인 5 variant 비교 (UAT 2026-05-21).
 *
 * 사용자 보고 (이미지 #17):
 *   - 1h 수업 → 학생 이름 truncate 심각 (block height 부족)
 *   - 1.5h+ → 정보 OK
 *   - 출력 범위 9-24시 강제 → 18-24시 빈 공간 큼
 *   - 5-stack 같은 겹침 → 좁아져서 잘림
 *
 * Variants:
 *   A. Compact Hierarchy — 시간 자동 범위 + 정보 우선순위 (1h 미만 학생 hidden)
 *   B. Counts Only       — 학생 이름 X, "N명" 만. 학생 명단은 page 2 별도
 *   C. Filter-First      — 인쇄 시 학생/강사 필터 권장. 매칭만 진하게
 *   D. Teacher Pages     — 강사별 페이지 분리 (강사 단위 운영 PDF)
 *   E. Horizontal Axis   — 시간 = 가로, 요일 = 세로. 가로 폭 활용
 *
 * 시드 데이터:
 *   5/18-24 주 (사용자가 본 PDF 와 같은 데이터셋)
 *
 * 사용법:
 *   PORT=3000 npm run dev
 *   http://localhost:3000/design-explorations/pdf-print-options
 */

const TEACHER_COLORS = {
  김선생: "#6366f1",
  이선생: "#0891b2",
  박코치: "#7c3aed",
  최쌤: "#ea580c",
  윤멘토교육: "#be185d",
  강사_uat: "#10b981",
} as const;

const SUBJECT_COLORS = {
  수학: "#EF4444",
  영어: "#3B82F6",
  국어: "#14B8A6",
  과학: "#F59E0B",
  사회: "#8B5CF6",
  코딩: "#EC4899",
  미술: "#06B6D4",
  중등수학심화: "#7C3AED",
} as const;

interface S {
  weekday: number; // 0=월
  startsAt: string;
  endsAt: string;
  subject: keyof typeof SUBJECT_COLORS;
  teacher: keyof typeof TEACHER_COLORS | null;
  students: string[];
}

const WEEK_DATA: S[] = [
  // 월
  { weekday: 0, startsAt: "09:00", endsAt: "10:00", subject: "수학", teacher: "김선생", students: ["홍길동", "김영수", "최민준"] },
  { weekday: 0, startsAt: "14:00", endsAt: "15:30", subject: "코딩", teacher: "박코치", students: ["홍길동", "김지우", "TomLee"] },
  // 화
  { weekday: 1, startsAt: "10:00", endsAt: "11:00", subject: "과학", teacher: "이선생", students: ["김영수", "최민준"] },
  { weekday: 1, startsAt: "14:00", endsAt: "15:00", subject: "사회", teacher: "최쌤", students: ["정수아", "최민준", "이서준"] },
  // 수
  { weekday: 2, startsAt: "09:00", endsAt: "10:00", subject: "수학", teacher: "김선생", students: ["홍길동", "김영수", "최민준"] },
  { weekday: 2, startsAt: "11:00", endsAt: "12:30", subject: "영어", teacher: "이선생", students: ["박지수", "정수아", "김지우"] },
  { weekday: 2, startsAt: "15:00", endsAt: "16:00", subject: "코딩", teacher: "박코치", students: ["홍길동", "김지우", "TomLee"] },
  // 목 (14:00 5-stack)
  { weekday: 3, startsAt: "10:00", endsAt: "11:00", subject: "과학", teacher: "이선생", students: ["김영수", "최민준"] },
  { weekday: 3, startsAt: "14:00", endsAt: "15:00", subject: "수학", teacher: "김선생", students: ["김영수", "한도윤"] },
  { weekday: 3, startsAt: "14:00", endsAt: "15:00", subject: "영어", teacher: "이선생", students: ["박지수", "김지우"] },
  { weekday: 3, startsAt: "14:00", endsAt: "15:00", subject: "코딩", teacher: "박코치", students: ["홍길동", "TomLee"] },
  { weekday: 3, startsAt: "14:00", endsAt: "15:00", subject: "사회", teacher: "최쌤", students: ["정수아", "최민준", "이서준"] },
  { weekday: 3, startsAt: "14:00", endsAt: "15:00", subject: "미술", teacher: null, students: ["강서연", "이서준"] },
  { weekday: 3, startsAt: "16:00", endsAt: "17:00", subject: "국어", teacher: "윤멘토교육", students: ["박지수"] },
  // 금
  { weekday: 4, startsAt: "09:00", endsAt: "10:00", subject: "수학", teacher: "김선생", students: ["홍길동", "김영수", "최민준"] },
  { weekday: 4, startsAt: "19:00", endsAt: "20:30", subject: "중등수학심화", teacher: "김선생", students: ["한도윤"] },
];

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function durationMin(s: S): number {
  return timeToMin(s.endsAt) - timeToMin(s.startsAt);
}

export default function PdfPrintOptionsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="mb-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">PDF 인쇄 디자인 — 5 variant 비교</h1>
        <p className="text-sm text-slate-400">
          현재 PDF 문제: (1) 1h 수업 학생 truncate, (2) 9-24시 강제 범위 빈 공간 큼, (3) 5-stack 겹침 잘림.
          각 variant 가 어떤 방향으로 개선하는지 비교.
        </p>
      </header>

      <div className="space-y-8 max-w-7xl mx-auto">
        <VariantSection
          letter="A"
          title="Compact Hierarchy — 자동 범위 + 정보 우선순위"
          description="시간 범위 = 데이터 기반 (min~max ± 30m). 수업 길이별 정보 단계: 1h 미만 = 제목/시간만, 1h~1.5h = + 강사, 1.5h+ = + 학생 truncate."
          rules={["출력 범위: 09:00 - 20:30 (데이터 기반)", "block 정보: 시간/길이별 단계 노출", "글자 크기: 7-8pt (인쇄 한도)"]}
        >
          <VariantA />
        </VariantSection>

        <VariantSection
          letter="B"
          title="Counts Only + Roster Page — 학생 이름은 page 2"
          description="모든 수업 = 제목 / 시간 / 강사 / '학생 N명'. 학생 이름 grid 에 표시 X. Page 2 에 '수업별 학생 명단' table 추가."
          rules={["block 깔끔 (truncate 0)", "Page 1 = grid, Page 2 = roster table", "학생 명단 한 곳에서 정렬"]}
        >
          <VariantB />
        </VariantSection>

        <VariantSection
          letter="C"
          title="Filter-First — 인쇄 시 필터 권장"
          description="인쇄 button 클릭 시 '어떤 필터로?' picker. 필터 적용 후 매칭 sessions 만 진하게. 비매칭 옅게 (또는 hidden 옵션)."
          rules={["인쇄 흐름: 인쇄 → 필터 선택 → preview → PDF", "필터 매칭만 정보 풍부", "비매칭 dim 또는 hidden 옵션"]}
        >
          <VariantC />
        </VariantSection>

        <VariantSection
          letter="D"
          title="Teacher Pages — 강사별 페이지 분리"
          description="강사 N명 → N 페이지 PDF. 각 페이지에 그 강사의 sessions 만 표시. 학생/시간 완전 풍부 (column 폭 100%)."
          rules={["페이지 = 강사 수", "각 페이지 column 폭 1/1 (단일 강사)", "강사 운영 / 시급 계산 / 일정 공유 용도"]}
        >
          <VariantD />
        </VariantSection>

        <VariantSection
          letter="E"
          title="Horizontal Axis — 시간 가로 / 요일 세로"
          description="시간축 = 가로 (09-21시 등 자동). 요일 = 세로. A4 landscape 의 가로 폭 활용. 한 row 가 한 요일이라 정보 풍부."
          rules={["가로축: 시간 (09:00-20:30 자동)", "세로축: 요일 (월~일)", "session = row 안 horizontal block. 시간 짧아도 학생 이름 표시 가능 (block 가로 폭 시간 비례)"]}
        >
          <VariantE />
        </VariantSection>
      </div>

      <section className="mt-10 max-w-3xl mx-auto text-sm text-slate-400">
        <h2 className="text-base font-bold text-slate-200 mb-3">결정 기준</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong className="text-slate-200">A Compact</strong>: 현재 layout 유지 + 자동 범위 + 정보 우선순위. 변경 최소</li>
          <li><strong className="text-slate-200">B Roster</strong>: grid 깔끔 + page 2 추가. 학생 정보 완전 보존</li>
          <li><strong className="text-slate-200">C Filter</strong>: 사용자가 의도 표현 후 인쇄. 매칭만 풍부. 학원장 운영 시나리오</li>
          <li><strong className="text-slate-200">D Teacher</strong>: 강사 1명 1페이지. 강사 공유 / 시급 / 일정 운영. 페이지 수 늘어남</li>
          <li><strong className="text-slate-200">E Horizontal</strong>: 가로 axis. 폭 활용 좋음 + 인쇄 익숙하지 않음 (학습 비용)</li>
          <li>혼합도 가능 — 예: A + D (기본 A, "강사별 인쇄" 옵션 추가)</li>
        </ul>
      </section>
    </div>
  );
}

// ============================================================
// VariantSection wrapper
// ============================================================

function VariantSection({
  letter,
  title,
  description,
  rules,
  children,
}: {
  letter: string;
  title: string;
  description: string;
  rules: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 inline-flex items-center justify-center rounded bg-amber-500 text-slate-950 text-sm font-bold">
          {letter}
        </span>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <p className="text-xs text-slate-400 mb-2">{description}</p>
      <ul className="text-[11px] text-slate-500 mb-4 list-disc list-inside space-y-0.5">
        {rules.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      <div className="flex justify-center">{children}</div>
    </div>
  );
}

// ============================================================
// PDF 미리보기 캔버스 — A4 landscape 비율 (1.41:1) 흰 종이
// ============================================================

function PdfCanvas({
  children,
  label = "5/18 - 5/24 · 인쇄: 2026-05-21",
  width = 880,
  height = 620,
}: {
  children: React.ReactNode;
  label?: string;
  width?: number;
  height?: number;
}) {
  return (
    <div
      className="bg-white text-slate-800 shadow-lg rounded-sm relative overflow-hidden"
      style={{ width, height }}
    >
      <div className="flex items-center justify-between px-4 py-2 text-[10px] border-b border-slate-200">
        <span className="font-bold">CLASS PLANNER</span>
        <span className="text-slate-500">{label}</span>
      </div>
      <div className="absolute inset-x-0 bottom-2 text-center text-[8px] text-slate-400">
        CLASS PLANNER · 1 / N
      </div>
      <div className="px-4 py-2 h-[calc(100%-40px)]">{children}</div>
    </div>
  );
}

// ============================================================
// Variant A — Compact Hierarchy
// ============================================================

function VariantA() {
  const dataMin = Math.min(...WEEK_DATA.map((s) => timeToMin(s.startsAt)));
  const dataMax = Math.max(...WEEK_DATA.map((s) => timeToMin(s.endsAt)));
  const startHour = Math.floor((dataMin - 30) / 60);
  const endHour = Math.ceil((dataMax + 30) / 60);
  return (
    <PdfCanvas label={`5/18 - 5/24 · 출력 ${startHour}:00 - ${endHour}:00 · 자동`}>
      <WeekGrid
        sessions={WEEK_DATA}
        startHour={startHour}
        endHour={endHour}
        renderBlock={(s) => {
          const dur = durationMin(s);
          return (
            <Block subject={s.subject} startsAt={s.startsAt}>
              {dur >= 60 && s.teacher && (
                <div className="text-[6.5px] truncate" style={{ color: TEACHER_COLORS[s.teacher] }}>
                  {s.teacher}
                </div>
              )}
              {dur >= 90 && (
                <div className="text-[6.5px] text-slate-700 truncate">
                  {s.students.join(", ")}
                </div>
              )}
            </Block>
          );
        }}
      />
    </PdfCanvas>
  );
}

// ============================================================
// Variant B — Counts Only + Roster
// ============================================================

function VariantB() {
  return (
    <div className="flex gap-4">
      <PdfCanvas label="5/18 - 5/24 · Page 1 (Grid)" width={620} height={440}>
        <WeekGrid
          sessions={WEEK_DATA}
          startHour={9}
          endHour={21}
          renderBlock={(s) => (
            <Block subject={s.subject} startsAt={s.startsAt}>
              {s.teacher && (
                <div className="text-[6.5px] truncate" style={{ color: TEACHER_COLORS[s.teacher] }}>
                  {s.teacher}
                </div>
              )}
              <div className="text-[6.5px] text-slate-500">학생 {s.students.length}명</div>
            </Block>
          )}
        />
      </PdfCanvas>
      <PdfCanvas label="Page 2 (Roster)" width={240} height={440}>
        <div className="text-[8px] mt-2">
          <div className="font-bold mb-1 text-[10px]">수업별 학생 명단</div>
          {WEEK_DATA.slice(0, 8).map((s, i) => (
            <div key={i} className="border-b border-slate-200 py-0.5">
              <div className="flex justify-between">
                <span className="font-semibold" style={{ color: SUBJECT_COLORS[s.subject] }}>
                  {["월", "화", "수", "목", "금", "토", "일"][s.weekday]} {s.startsAt} {s.subject}
                </span>
                <span className="text-slate-500">{s.students.length}명</span>
              </div>
              <div className="text-slate-600">{s.students.join(", ")}</div>
            </div>
          ))}
          <div className="text-slate-400 mt-1">... +{WEEK_DATA.length - 8} 더</div>
        </div>
      </PdfCanvas>
    </div>
  );
}

// ============================================================
// Variant C — Filter-First
// ============================================================

function VariantC() {
  // 필터: 홍길동만
  const filtered = WEEK_DATA.filter((s) => s.students.includes("홍길동"));
  const others = WEEK_DATA.filter((s) => !s.students.includes("홍길동"));
  return (
    <PdfCanvas label="5/18 - 5/24 · 필터: 학생 = 홍길동 · 6개 매칭">
      <div className="text-[8px] text-slate-500 mb-1">
        ✦ 필터: <strong className="text-slate-700">홍길동</strong> (학생) · 매칭 {filtered.length}개 / 전체 {WEEK_DATA.length}개
      </div>
      <WeekGrid
        sessions={[...filtered, ...others]}
        startHour={9}
        endHour={20}
        renderBlock={(s) => {
          const isMatch = s.students.includes("홍길동");
          return (
            <Block subject={s.subject} startsAt={s.startsAt} dimmed={!isMatch}>
              {s.teacher && (
                <div className="text-[6.5px] truncate" style={{ color: TEACHER_COLORS[s.teacher] }}>
                  {s.teacher}
                </div>
              )}
              {isMatch && (
                <div className="text-[6.5px] text-slate-700 truncate">
                  {s.students.join(", ")}
                </div>
              )}
            </Block>
          );
        }}
      />
    </PdfCanvas>
  );
}

// ============================================================
// Variant D — Teacher Pages
// ============================================================

function VariantD() {
  const kimSessions = WEEK_DATA.filter((s) => s.teacher === "김선생");
  return (
    <div className="flex gap-4">
      <PdfCanvas label="강사: 김선생 · Page 1 / 6" width={560} height={420}>
        <div className="text-[10px] font-bold mb-1" style={{ color: TEACHER_COLORS.김선생 }}>
          김선생 · 이번 주 {kimSessions.length}개 수업
        </div>
        <WeekGrid
          sessions={kimSessions}
          startHour={9}
          endHour={21}
          renderBlock={(s) => (
            <Block subject={s.subject} startsAt={s.startsAt}>
              <div className="text-[7px] text-slate-700">{s.endsAt}</div>
              <div className="text-[7px] text-slate-700 truncate">
                {s.students.join(", ")}
              </div>
            </Block>
          )}
        />
      </PdfCanvas>
      <div className="flex flex-col gap-1 text-[10px] text-slate-300">
        <div>+ 이선생 (P2)</div>
        <div>+ 박코치 (P3)</div>
        <div>+ 최쌤 (P4)</div>
        <div>+ 윤멘토교육 (P5)</div>
        <div>+ 강사_uat (P6)</div>
      </div>
    </div>
  );
}

// ============================================================
// Variant E — Horizontal Axis
// ============================================================

function VariantE() {
  const startHour = 9;
  const endHour = 21;
  const hourCount = endHour - startHour;
  const HOUR_WIDTH = 60;
  const ROW_HEIGHT = 64;
  const TOTAL_WIDTH = hourCount * HOUR_WIDTH;
  const weekdays = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <PdfCanvas label="5/18 - 5/24 · 가로 시간축">
      <div className="flex text-[8px]">
        <div className="w-8 shrink-0" />
        <div className="flex-1 relative" style={{ height: 12 }}>
          {Array.from({ length: hourCount + 1 }).map((_, i) => (
            <span
              key={i}
              className="absolute text-slate-500"
              style={{ left: (i / hourCount) * 100 + "%", transform: "translateX(-50%)" }}
            >
              {startHour + i}:00
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-px">
        {weekdays.map((label, weekday) => {
          const daySessions = WEEK_DATA.filter((s) => s.weekday === weekday);
          return (
            <div key={weekday} className="flex items-stretch">
              <div className="w-8 shrink-0 text-[9px] font-bold flex items-center justify-center border-r border-slate-300" style={{ height: ROW_HEIGHT }}>
                {label}
              </div>
              <div
                className="flex-1 relative border-b border-slate-200"
                style={{ height: ROW_HEIGHT }}
              >
                {Array.from({ length: hourCount + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-slate-200"
                    style={{ left: (i / hourCount) * 100 + "%" }}
                  />
                ))}
                {daySessions.map((s, i) => {
                  const startPct = ((timeToMin(s.startsAt) - startHour * 60) / 60 / hourCount) * 100;
                  const widthPct = (durationMin(s) / 60 / hourCount) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute top-0.5 bottom-0.5 rounded text-[6.5px] px-1 py-0.5 overflow-hidden"
                      style={{
                        left: `${startPct}%`,
                        width: `calc(${widthPct}% - 2px)`,
                        background: `${SUBJECT_COLORS[s.subject]}26`,
                        borderLeft: `2px solid ${SUBJECT_COLORS[s.subject]}`,
                      }}
                    >
                      <div className="font-bold truncate" style={{ color: SUBJECT_COLORS[s.subject] }}>
                        {s.subject}
                      </div>
                      <div className="text-slate-600 truncate">
                        {s.startsAt}
                      </div>
                      <div className="text-slate-700 truncate">
                        {s.students.slice(0, 2).join(", ")}
                        {s.students.length > 2 && ` +${s.students.length - 2}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </PdfCanvas>
  );
}

// ============================================================
// Shared — WeekGrid (7 columns vertical timeline)
// ============================================================

function WeekGrid({
  sessions,
  startHour,
  endHour,
  renderBlock,
}: {
  sessions: S[];
  startHour: number;
  endHour: number;
  renderBlock: (s: S) => React.ReactNode;
}) {
  const hourCount = endHour - startHour;
  const HOUR_HEIGHT = 30;
  const TOTAL_HEIGHT = hourCount * HOUR_HEIGHT;
  const weekdays = ["월", "화", "수", "목", "금", "토", "일"];

  // overlap groups per weekday + time
  const groupsByKey = new Map<string, S[]>();
  for (const s of sessions) {
    const k = `${s.weekday}|${s.startsAt}-${s.endsAt}`;
    const list = groupsByKey.get(k) ?? [];
    list.push(s);
    groupsByKey.set(k, list);
  }

  return (
    <div className="flex" style={{ height: TOTAL_HEIGHT + 16 }}>
      <div className="w-8 shrink-0 relative text-[7px] text-slate-500">
        {Array.from({ length: hourCount + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{ top: i * HOUR_HEIGHT + 16, right: 4, transform: "translateY(-50%)" }}
          >
            {String(startHour + i).padStart(2, "0")}:00
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 border-l border-t border-slate-200">
        {weekdays.map((label, weekday) => {
          const daySessions = sessions.filter((s) => s.weekday === weekday);
          return (
            <div
              key={weekday}
              className="relative border-r border-slate-200"
              style={{ height: TOTAL_HEIGHT + 16 }}
            >
              <div className="text-[8px] text-center font-semibold py-0.5 border-b border-slate-200">
                {label}
              </div>
              <div className="relative" style={{ height: TOTAL_HEIGHT }}>
                {Array.from({ length: hourCount + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-slate-100"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}
                {daySessions.map((s, i) => {
                  const k = `${s.weekday}|${s.startsAt}-${s.endsAt}`;
                  const group = groupsByKey.get(k) ?? [s];
                  const idx = group.indexOf(s);
                  const widthPct = 100 / group.length;
                  const top = ((timeToMin(s.startsAt) - startHour * 60) / 60) * HOUR_HEIGHT;
                  const h = (durationMin(s) / 60) * HOUR_HEIGHT;
                  return (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        top: top + 1,
                        height: h - 2,
                        left: `${idx * widthPct}%`,
                        width: `calc(${widthPct}% - 1px)`,
                      }}
                    >
                      {renderBlock(s)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Block({
  subject,
  startsAt,
  children,
  dimmed,
}: {
  subject: keyof typeof SUBJECT_COLORS;
  startsAt: string;
  children?: React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <div
      className="h-full w-full rounded px-0.5 overflow-hidden"
      style={{
        background: `${SUBJECT_COLORS[subject]}22`,
        borderLeft: `2px solid ${SUBJECT_COLORS[subject]}`,
        opacity: dimmed ? 0.25 : 1,
      }}
    >
      <div className="text-[7px] font-bold truncate" style={{ color: SUBJECT_COLORS[subject] }}>
        {subject}
      </div>
      <div className="text-[6.5px] text-slate-500 truncate">{startsAt}</div>
      {children}
    </div>
  );
}
