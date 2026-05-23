"use client";

import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Edit3,
  Eye,
  EyeOff,
  Filter,
  GraduationCap,
  History,
  Info,
  Inbox,
  Layers,
  Mail,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Trash2,
  Undo2,
  UserCog,
  UserMinus,
  Users,
  XCircle,
} from "lucide-react";

/**
 * "강사 보관" UX 단어/흐름 재설계 mockup
 *
 * 사용자 보고 (2026-05-24):
 *   1. settings ⋯ 메뉴의 "강사 정보 수정" 이 비활성화 — 왜 회색?
 *   2. "보관" 이라는 단어가 일반 사용자에게 이해 안 됨
 *      → "삭제" 단어로 통일 + 모달에서 "보관 가능" 선택권 제시
 *   3. typing 모달의 "토글" 단어 이해 안 됨
 *   4. 보관/복구 흐름 자세히
 *   5. 보관과 별개로 있는 "데이터 복구" 기능과 어떻게 다른가?
 *
 * 진단:
 *   - "강사 정보 수정" disabled = settings/page.tsx:1490 의 placeholder
 *     (미구현 — 메뉴에 노출되어 있으나 클릭 불가)
 *   - 메뉴 "보관" + 모달 "보관" + /teachers 토글 "보관된 강사 보기" + 복구 액션
 *     — 일관성 OK 지만 단어 자체가 일반 사용자 어휘 X
 *   - 데이터 복구 = data_snapshots 테이블 (학원 전체 시점 백업). 강사 보관과 별개 entity.
 *
 * 본 mockup 은 단어/흐름 대안을 여러 가지 제시 — 사용자가 한 조합 선택 시 별도 PR 로 적용.
 */
export default function TeacherArchiveVocabularyPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        <Header />
        <DiagnosisSection />
        <CompareArchiveVsRestore />
        <SectionA_MenuVocab />
        <SectionB_ModalWords />
        <SectionC_FlowDiagram />
        <SectionD_ListToggleAlternatives />
        <SectionE_FinalRecommendation />
        <SectionF_EditInfoDisabled />
      </div>
    </main>
  );
}

function Header() {
  return (
    <header>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Archive className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold leading-tight">강사 "보관" UX 단어/흐름 재설계</h1>
          <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
            일반 사용자 어휘 기준 — 단어 + 흐름 + 차이 명시
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        실제 영향 —
        <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)]">/settings</code>
        <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)]">/teachers</code>
        <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)]">api/teachers/[id]/archive</code>
        <span className="ml-2 px-2 py-0.5 rounded-full bg-[var(--color-bg-secondary)] text-[10px]">
          본 mockup 은 코드 변경 X · 단어/흐름 alternative 검토용
        </span>
      </div>
    </header>
  );
}

function DiagnosisSection() {
  const items = [
    {
      title: "메뉴 단어 \"보관\"",
      issue: "일반 사용자가 보관 = 어디로 저장? 삭제와 다른 점이 뭐지? 라는 혼란.",
      where: "/settings 강사 row ⋯ 메뉴 + 모달 제목 + 토스트 메시지",
    },
    {
      title: "토스트/모달 \"보관된 강사 보기 토글로 복구\"",
      issue: "토글 = 개발자 단어. 복구 위치(다른 페이지)가 본문 텍스트로만 안내됨.",
      where: "TypedConfirmationModal description",
    },
    {
      title: "\"강사 정보 수정\" 회색 표시",
      issue: "사용자가 클릭 가능한지 / 권한 부족인지 / 미구현인지 알 수 없음. 침묵 disabled.",
      where: "settings/page.tsx:1490 placeholder (미구현)",
    },
    {
      title: "\"데이터 복구\" 와 혼동",
      issue: "보관/복구 와 별개 entity (학원 전체 백업)인데 단어 \"복구\" 가 두 곳에서 공용.",
      where: "settings 페이지 하단 \"데이터 이력 섹션\"",
    },
  ];
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400" /> 현재 단어/흐름 진단 (4가지)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-4"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                #{i + 1}
              </span>
              <h3 className="font-medium text-sm">{it.title}</h3>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-2">
              {it.issue}
            </p>
            <div className="text-[10px] text-[var(--color-text-muted)] font-mono">{it.where}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompareArchiveVsRestore() {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Layers className="w-5 h-5 text-sky-400" /> "강사 보관" vs "데이터 복구" — 어떻게 다른가?
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CompareCard
          icon={<UserMinus className="w-5 h-5" />}
          tone="amber"
          label="강사 보관 (개별)"
          subtitle="teachers.archived_at 컬럼"
          rows={[
            ["대상", "강사 1명"],
            ["저장", "강사 row 그대로 + archived_at = 시각"],
            ["담당 수업", "그대로 유지 (사라지지 않음)"],
            ["목록 표시", "settings/teachers 활성 목록에서 숨김"],
            ["복구 위치", "/teachers 페이지 \"보관된 강사 보기\" → \"복구\" 버튼"],
            ["복구 효과", "즉시 활성으로 (archived_at = NULL)"],
            ["보관 기간", "무기한"],
          ]}
        />
        <CompareCard
          icon={<Database className="w-5 h-5" />}
          tone="sky"
          label="데이터 복구 (전체 시점)"
          subtitle="data_snapshots 테이블"
          rows={[
            ["대상", "학원 전체 (학생/강사/과목/세션 일괄)"],
            ["저장", "특정 시점의 데이터 스냅샷 JSON"],
            ["담당 수업", "그 시점 상태 그대로 복원"],
            ["목록 표시", "/settings 하단 \"데이터 이력\" 섹션"],
            ["복구 위치", "데이터 이력에서 시점 선택 → 복원"],
            ["복구 효과", "전체를 그 시점으로 되돌림 (현재 상태 덮어씀)"],
            ["보관 기간", "자동/수동 스냅샷 정책 (별도 ADR)"],
          ]}
        />
      </div>
      <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30 p-4 text-xs text-[var(--color-text-secondary)] leading-relaxed">
        <strong className="text-[var(--color-text-primary)]">한 줄 요약:</strong> 강사 보관은
        "한 명만 잠깐 빼두기 (담당 수업 보존)". 데이터 복구는 "타임머신으로 학원 전체를 그 시점으로
        되돌리기 (현재 상태 덮어쓰기)". 두 기능은 동일한 단어 "복구" 를 공유하지만 작동 범위와
        파괴력이 다름 — 본 mockup §B 에서 단어를 분리 제안.
      </div>
    </section>
  );
}

function CompareCard({
  icon,
  tone,
  label,
  subtitle,
  rows,
}: {
  icon: React.ReactNode;
  tone: "amber" | "sky";
  label: string;
  subtitle: string;
  rows: [string, string][];
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-500/30 bg-amber-500/5"
      : "border-sky-500/30 bg-sky-500/5";
  const iconClass = tone === "amber" ? "bg-amber-500/15 text-amber-400" : "bg-sky-500/15 text-sky-400";
  return (
    <div className={`rounded-xl border p-5 ${toneClass}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}>
          {icon}
        </div>
        <div>
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-[10px] text-[var(--color-text-muted)] font-mono">{subtitle}</div>
        </div>
      </div>
      <dl className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[80px_1fr] gap-2 text-[12px]">
            <dt className="text-[var(--color-text-muted)]">{k}</dt>
            <dd className="text-[var(--color-text-secondary)] leading-relaxed">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ───────────────── Section A — 메뉴 단어 대안 ───────────────── */

function SectionA_MenuVocab() {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
        <MoreHorizontal className="w-5 h-5 text-emerald-400" /> §A. 메뉴 단어 — 4가지 대안
      </h2>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        강사 row 의 ⋯ 메뉴. 현재 "보관" 단어 → 더 직관적인 단어로.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VariantCard
          number="A-1"
          recommended
          title={'삭제 → 모달에서 "보관" vs "완전 삭제" 선택'}
          subtitle={'사용자 제안. 단어는 "삭제" 한 가지로 통일.'}
          mockup={<MenuMockup label="삭제" tone="red" disabledEdit />}
          modalNote={<>
            모달에서 두 옵션 제시 — <strong>보관 (언제든 복구 가능)</strong>{" "}
            <span className="text-[var(--color-text-muted)]">/ 완전 삭제 (복구 불가)</span>
          </>}
          pros={["일반 사용자 어휘 (\"삭제\")", "메뉴 항목 최소화", "모달에서 자세 설명 가능"]}
          cons={["보관 단어가 모달에서 1번 등장 — 그곳에서 설명 필요"]}
        />
        <VariantCard
          number="A-2"
          title="비활성화 / 영구 삭제 — 두 메뉴 분리"
          subtitle="명시적. 두 액션 즉시 보임."
          mockup={
            <MenuMockup
              label="비활성화"
              tone="amber"
              extraDangerLabel="영구 삭제"
              disabledEdit
            />
          }
          pros={["감춤 없이 명시", "사용자가 메뉴에서 결정"]}
          cons={["메뉴 항목 늘어남 (4 → 5)", "\"비활성화\" 도 개발자 어휘 가까움"]}
        />
        <VariantCard
          number="A-3"
          title="팀에서 제거 → 모달에서 보관/완전삭제"
          subtitle="멤버 관리 어휘 차용 (현재 admin row 와 통일)"
          mockup={<MenuMockup label="팀에서 제거" tone="red" disabledEdit />}
          modalNote={<>
            settings 의 active admin row \"팀에서 제외\" 와 동일 패턴. 모달에서{" "}
            <strong>보관 vs 완전 삭제</strong> 선택.
          </>}
          pros={["멤버 관리와 일관성 (active admin row 와 동일 어휘)", "관계 중심 어휘"]}
          cons={["미초대 강사도 \"팀\" 으로 부르는 게 자연스러운지 검토 필요"]}
        />
        <VariantCard
          number="A-4"
          title="삭제 → submenu 호버 → 보관 / 영구"
          subtitle="2단 메뉴. 한 번 호버로 선택지 펼침."
          mockup={<SubmenuMockup />}
          pros={["1차 메뉴 단순 + 2차에서 명시"]}
          cons={["호버 인터랙션 — 모바일/터치 불편", "메뉴 안에 메뉴는 일반 사용자에 낯섦"]}
        />
      </div>
    </section>
  );
}

function MenuMockup({
  label,
  tone,
  extraDangerLabel,
  disabledEdit,
}: {
  label: string;
  tone: "red" | "amber";
  extraDangerLabel?: string;
  disabledEdit?: boolean;
}) {
  const labelClass = tone === "red" ? "text-red-400" : "text-amber-400";
  return (
    <div className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1.5 text-sm">
      <MenuRow icon={<Mail className="w-3.5 h-3.5" />}>초대 보내기</MenuRow>
      <MenuRow icon={<RotateCcw className="w-3.5 h-3.5" />}>다른 강사로 교체</MenuRow>
      <MenuRow icon={<Edit3 className="w-3.5 h-3.5" />} disabled={disabledEdit}>
        강사 정보 수정
      </MenuRow>
      <div className="my-1 border-t border-[var(--color-border)]" />
      <MenuRow icon={<Trash2 className="w-3.5 h-3.5" />} labelClass={labelClass}>
        {label}
      </MenuRow>
      {extraDangerLabel && (
        <MenuRow icon={<XCircle className="w-3.5 h-3.5" />} labelClass="text-red-400">
          {extraDangerLabel}
        </MenuRow>
      )}
    </div>
  );
}

function SubmenuMockup() {
  return (
    <div className="w-full grid grid-cols-2 gap-2">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1.5 text-sm">
        <MenuRow icon={<Mail className="w-3.5 h-3.5" />}>초대 보내기</MenuRow>
        <MenuRow icon={<RotateCcw className="w-3.5 h-3.5" />}>다른 강사로 교체</MenuRow>
        <MenuRow icon={<Edit3 className="w-3.5 h-3.5" />} disabled>
          강사 정보 수정
        </MenuRow>
        <div className="my-1 border-t border-[var(--color-border)]" />
        <MenuRow
          icon={<Trash2 className="w-3.5 h-3.5" />}
          labelClass="text-red-400"
          trailing={<ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />}
          active
        >
          삭제
        </MenuRow>
      </div>
      <div className="rounded-lg border border-amber-500/40 bg-[var(--color-bg-secondary)] py-1.5 text-sm shadow-lg">
        <div className="px-3 py-1 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
          삭제 방식 선택
        </div>
        <MenuRow icon={<Archive className="w-3.5 h-3.5" />} labelClass="text-amber-300">
          보관 (언제든 복구)
        </MenuRow>
        <MenuRow icon={<XCircle className="w-3.5 h-3.5" />} labelClass="text-red-400">
          완전 삭제 (복구 불가)
        </MenuRow>
      </div>
    </div>
  );
}

function MenuRow({
  icon,
  children,
  disabled,
  labelClass,
  active,
  trailing,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
  labelClass?: string;
  active?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 text-[13px] ${
        active ? "bg-[var(--color-bg-tertiary)]" : ""
      } ${disabled ? "text-[var(--color-text-muted)]/60" : labelClass ?? "text-[var(--color-text-primary)]"}`}
    >
      <span className="opacity-70">{icon}</span>
      <span className="flex-1">{children}</span>
      {trailing}
    </div>
  );
}

/* ───────────────── Section B — 모달 단어 ───────────────── */

function SectionB_ModalWords() {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
        <UserMinus className="w-5 h-5 text-rose-400" /> §B. 모달 단어 — 3가지 대안
      </h2>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        ⋯ 메뉴 선택 후 뜨는 typing 확인 모달. 현재 "보관" + "토글" 단어를 일반 사용자 어휘로.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ModalMockupVariant
          number="B-1"
          recommended
          title="삭제 한 단어 + 두 옵션 카드"
          subtitle={'A-1 과 짝. "삭제" 모달에서 선택지 명시.'}
          headerLabel="박코치 강사를 삭제할까요?"
          chipText="삭제"
          options={[
            {
              icon: <Archive className="w-4 h-4" />,
              tone: "amber",
              title: "보관",
              desc: "강사 정보·담당 수업 그대로 보존. 언제든 복구.",
              tags: ["기본 선택", "복구 가능"],
            },
            {
              icon: <XCircle className="w-4 h-4" />,
              tone: "red",
              title: "완전 삭제",
              desc: "강사 row 영구 삭제. 담당 수업은 \"강사 정보 없음\". 복구 불가.",
              tags: ["주의", "복구 불가"],
            },
          ]}
        />
        <ModalMockupVariant
          number="B-2"
          title={'"숨기기 / 완전 삭제" 단어 분리'}
          subtitle={'"보관" 대신 "숨기기" — UI 동작에 가까운 어휘.'}
          headerLabel="박코치 강사 처리 방식"
          options={[
            {
              icon: <EyeOff className="w-4 h-4" />,
              tone: "amber",
              title: "목록에서 숨기기",
              desc: "강사 정보 보존. \"숨겨진 강사\" 목록에서 다시 보이게 가능.",
              tags: ["기본 선택"],
            },
            {
              icon: <XCircle className="w-4 h-4" />,
              tone: "red",
              title: "완전 삭제",
              desc: "강사 row 영구 삭제. 복구 불가.",
              tags: ["주의"],
            },
          ]}
        />
        <ModalMockupVariant
          number="B-3"
          title="모달 한 옵션만 + 영구 삭제는 별도 메뉴"
          subtitle={'A-2 와 짝. 모달은 "비활성화" 단일 흐름.'}
          headerLabel="박코치 강사를 비활성화할까요?"
          singleOption={{
            icon: <Archive className="w-4 h-4" />,
            tone: "amber",
            title: "비활성화 (보관)",
            desc: "목록에서 숨기되 데이터 보존. \"비활성 강사\" 페이지에서 복구.",
            tags: ["복구 가능"],
          }}
        />
      </div>
    </section>
  );
}

function ModalMockupVariant({
  number,
  title,
  subtitle,
  headerLabel,
  chipText,
  options,
  singleOption,
  recommended,
}: {
  number: string;
  title: string;
  subtitle: string;
  headerLabel: string;
  chipText?: string;
  options?: ModalOption[];
  singleOption?: ModalOption;
  recommended?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border ${
        recommended ? "border-emerald-500/30 bg-emerald-500/5" : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40"
      } p-4`}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{number}</span>
            {recommended && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[9px] text-emerald-300 font-medium">
                추천
              </span>
            )}
          </div>
          <div className="font-medium text-sm mt-0.5">{title}</div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{subtitle}</div>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3.5">
        <div className="flex items-start gap-2 mb-3">
          <UserMinus className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-[13px] font-medium leading-snug">{headerLabel}</div>
        </div>
        {options && (
          <div className="space-y-2 mb-3">
            {options.map((o, i) => (
              <ModalOptionRow key={i} {...o} />
            ))}
          </div>
        )}
        {singleOption && (
          <div className="mb-3">
            <ModalOptionRow {...singleOption} />
          </div>
        )}
        <div className="rounded-md bg-[var(--color-bg-tertiary)]/40 px-2.5 py-2 text-[10px] text-[var(--color-text-muted)] flex items-center gap-1.5 mb-3">
          <Sparkles className="w-3 h-3" />
          확인을 위해 <code className="px-1 py-0.5 rounded bg-[var(--color-bg-secondary)]">박코치</code> 를 정확히 입력해주세요
        </div>
        <div className="flex items-center gap-2">
          <button className="flex-1 rounded-md border border-[var(--color-border)] py-1.5 text-[12px] text-[var(--color-text-secondary)]">
            취소
          </button>
          <button className="flex-1 rounded-md bg-rose-500/80 py-1.5 text-[12px] font-medium text-white">
            {chipText ?? "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}

type ModalOption = {
  icon: React.ReactNode;
  tone: "amber" | "red";
  title: string;
  desc: string;
  tags: string[];
};

function ModalOptionRow({ icon, tone, title, desc, tags }: ModalOption) {
  const borderClass =
    tone === "amber" ? "border-amber-500/30" : "border-red-500/30";
  const iconClass = tone === "amber" ? "text-amber-300" : "text-red-300";
  return (
    <div className={`rounded-md border ${borderClass} bg-[var(--color-bg-secondary)]/60 px-2.5 py-2`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={iconClass}>{icon}</span>
        <span className="text-[12px] font-medium">{title}</span>
        <div className="ml-auto flex gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] text-[9px] text-[var(--color-text-muted)]"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{desc}</p>
    </div>
  );
}

/* ───────────────── Section C — 흐름 도식 ───────────────── */

function SectionC_FlowDiagram() {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
        <ArrowRight className="w-5 h-5 text-indigo-400" /> §C. 보관 → 복구 흐름 (시각화)
      </h2>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        강사를 "보관" 후 어디에 있고 어떻게 다시 활성화하는지. 현재 흐름 + 권장 흐름.
      </p>

      <div className="space-y-6">
        <FlowRow
          tone="current"
          label="현재 흐름"
          steps={[
            { icon: <MoreHorizontal className="w-4 h-4" />, page: "/settings", label: "⋯ → 보관" },
            { icon: <UserMinus className="w-4 h-4" />, page: "확인 모달", label: "이름 타이핑 → 보관" },
            { icon: <EyeOff className="w-4 h-4" />, page: "/settings", label: "강사 목록에서 숨김" },
            { icon: <Eye className="w-4 h-4" />, page: "/teachers", label: "토글 ON → \"보관된 강사 보기\"" },
            { icon: <Undo2 className="w-4 h-4" />, page: "/teachers (보관 모드)", label: "row 우측 \"복구\" 버튼" },
            { icon: <Check className="w-4 h-4" />, page: "/settings + /teachers", label: "활성 목록으로 돌아옴" },
          ]}
        />
        <FlowRow
          tone="recommended"
          label="권장 흐름 (A-1 + B-1 + D-1 채택 가정)"
          steps={[
            { icon: <MoreHorizontal className="w-4 h-4" />, page: "/settings", label: "⋯ → 삭제" },
            {
              icon: <Archive className="w-4 h-4" />,
              page: "확인 모달",
              label: "\"보관\" 선택 (기본) → 이름 타이핑",
            },
            { icon: <Inbox className="w-4 h-4" />, page: "/teachers", label: "탭 \"보관함\" 으로 이동" },
            { icon: <ArchiveRestore className="w-4 h-4" />, page: "/teachers — 보관함", label: "row 의 \"되살리기\" 버튼" },
            { icon: <Check className="w-4 h-4" />, page: "/settings + /teachers", label: "활성 탭으로 자동 전환" },
          ]}
        />
      </div>

      <div className="mt-5 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4 text-xs text-[var(--color-text-secondary)] leading-relaxed">
        <strong className="text-indigo-300">권장 흐름의 차이:</strong> (1) 메뉴 단어 통일 (\"삭제\"
        한 가지). (2) 모달에서 보관/완전삭제 명시. (3) 복구는 \"보관된 강사 보기 토글\" 대신
        \"보관함 탭\" — 사용자가 단어 \"탭\" 은 익숙. (4) 복구 액션 라벨 \"복구\" → \"되살리기\"
        (의미 직관적, 데이터 복구와 어휘 겹침 회피).
      </div>
    </section>
  );
}

function FlowRow({
  tone,
  label,
  steps,
}: {
  tone: "current" | "recommended";
  label: string;
  steps: { icon: React.ReactNode; page: string; label: string }[];
}) {
  const toneClass =
    tone === "current"
      ? "border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30"
      : "border-emerald-500/30 bg-emerald-500/5";
  const labelTone = tone === "current" ? "text-[var(--color-text-muted)]" : "text-emerald-300";
  return (
    <div className={`rounded-xl border ${toneClass} p-4`}>
      <div className={`text-[11px] font-medium uppercase tracking-wider mb-3 ${labelTone}`}>
        {label}
      </div>
      <ol className="grid grid-cols-1 md:grid-cols-6 gap-1">
        {steps.map((s, i) => (
          <li key={i} className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2 text-[12px] font-medium">
              <span className="w-7 h-7 rounded-md bg-[var(--color-bg-tertiary)] flex items-center justify-center text-[var(--color-text-secondary)]">
                {s.icon}
              </span>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{i + 1}</span>
            </div>
            <div className="text-[11px] text-[var(--color-text-secondary)] leading-snug">
              {s.label}
            </div>
            <div className="text-[9px] text-[var(--color-text-muted)] font-mono">{s.page}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ───────────────── Section D — 보관 목록 노출 방식 ───────────────── */

function SectionD_ListToggleAlternatives() {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
        <Filter className="w-5 h-5 text-cyan-400" /> §D. /teachers — "보관된 강사" 노출 방식
      </h2>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        현재 헤더에 \"보관된 강사 보기\" 토글. 일반 사용자에게 \"토글\" 단어는 낯섦. 3가지 대안.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ListVariantCard
          number="D-1"
          recommended
          title="탭 — 활성 / 보관함"
          subtitle={'가장 익숙한 패턴. "탭" 은 일반 사용자 어휘.'}
          mockup={<TabsMockup />}
          pros={[
            "탭 = 인지 비용 낮음 (이메일/메신저 보관함 등 익숙)",
            "보관된 강사 수 카운트 즉시 표시 가능",
            "\"보관함\" 명사 — 의미 직관적",
          ]}
          cons={["헤더 공간 차지 약간 증가"]}
        />
        <ListVariantCard
          number="D-2"
          title="필터 — segmented control"
          subtitle="검색창 옆 미세한 segment. 활성 / 보관 / 전체."
          mockup={<SegmentMockup />}
          pros={["헤더 공간 최소", "전체 보기도 지원 (active + archived 한 화면)"]}
          cons={["segmented control 도 토글 변형 — 단어는 \"필터\""]}
        />
        <ListVariantCard
          number="D-3"
          title="별도 페이지 — /teachers/archived"
          subtitle={'보관함을 완전히 분리. 헤더 우측 "보관함" 링크.'}
          mockup={<SeparatePageMockup />}
          pros={["활성 목록은 단순", "보관함 페이지에 \"되살리기\" 액션 큰 버튼 OK"]}
          cons={["페이지 1개 추가 — 사용자가 \"보관함\" 위치 학습 필요"]}
        />
      </div>
    </section>
  );
}

function TabsMockup() {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-3">
      <div className="flex items-center gap-1 mb-2">
        <TabButton active label="활성 강사" count={7} />
        <TabButton label="보관함" count={2} />
      </div>
      <div className="space-y-1">
        <TeacherRowMockup name="박코치" />
        <TeacherRowMockup name="최쌤" />
      </div>
    </div>
  );
}

function TabButton({ label, count, active }: { label: string; count: number; active?: boolean }) {
  return (
    <button
      className={`px-3 py-1.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 ${
        active
          ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
          : "text-[var(--color-text-muted)]"
      }`}
    >
      {label}
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          active
            ? "bg-amber-500/20 text-amber-300"
            : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function SegmentMockup() {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-3">
      <div className="flex items-center gap-2 mb-2">
        <input
          className="flex-1 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] px-2 py-1.5 text-[11px] text-[var(--color-text-muted)]"
          placeholder="강사 검색"
          readOnly
        />
        <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden text-[10px]">
          <span className="px-2 py-1 bg-[var(--color-bg-tertiary)]">활성</span>
          <span className="px-2 py-1 text-[var(--color-text-muted)]">보관</span>
          <span className="px-2 py-1 text-[var(--color-text-muted)]">전체</span>
        </div>
      </div>
      <div className="space-y-1">
        <TeacherRowMockup name="박코치" />
      </div>
    </div>
  );
}

function SeparatePageMockup() {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-medium">강사 (7명)</span>
        <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[var(--color-text-muted)] border border-[var(--color-border)]">
          <Inbox className="w-3 h-3" />
          보관함 (2)
        </button>
      </div>
      <div className="space-y-1">
        <TeacherRowMockup name="박코치" />
        <TeacherRowMockup name="최쌤" />
      </div>
    </div>
  );
}

function TeacherRowMockup({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[var(--color-bg-primary)]/50 text-[11px]">
      <span className="w-5 h-5 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center text-[9px]">
        {name[0]}
      </span>
      <span className="flex-1">{name}</span>
      <span className="text-[var(--color-text-muted)] text-[9px]">미초대</span>
    </div>
  );
}

function ListVariantCard({
  number,
  title,
  subtitle,
  mockup,
  pros,
  cons,
  recommended,
}: {
  number: string;
  title: string;
  subtitle: string;
  mockup: React.ReactNode;
  pros: string[];
  cons: string[];
  recommended?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border ${
        recommended ? "border-emerald-500/30 bg-emerald-500/5" : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40"
      } p-4`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{number}</span>
        {recommended && (
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[9px] text-emerald-300 font-medium">
            추천
          </span>
        )}
      </div>
      <div className="font-medium text-sm mb-0.5">{title}</div>
      <div className="text-[11px] text-[var(--color-text-muted)] mb-3">{subtitle}</div>
      <div className="mb-3">{mockup}</div>
      <ProsCons pros={pros} cons={cons} />
    </div>
  );
}

/* ───────────────── Section A — VariantCard 공통 ───────────────── */

function VariantCard({
  number,
  title,
  subtitle,
  mockup,
  modalNote,
  pros,
  cons,
  recommended,
}: {
  number: string;
  title: string;
  subtitle: string;
  mockup: React.ReactNode;
  modalNote?: React.ReactNode;
  pros: string[];
  cons: string[];
  recommended?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border ${
        recommended ? "border-emerald-500/30 bg-emerald-500/5" : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40"
      } p-4`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{number}</span>
        {recommended && (
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[9px] text-emerald-300 font-medium">
            추천
          </span>
        )}
      </div>
      <div className="font-medium text-sm mb-0.5">{title}</div>
      <div className="text-[11px] text-[var(--color-text-muted)] mb-3">{subtitle}</div>
      <div className="mb-3">{mockup}</div>
      {modalNote && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/40 px-2.5 py-2 text-[11px] text-[var(--color-text-secondary)] mb-3 leading-relaxed">
          {modalNote}
        </div>
      )}
      <ProsCons pros={pros} cons={cons} />
    </div>
  );
}

function ProsCons({ pros, cons }: { pros: string[]; cons: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1 font-medium">
          장점
        </div>
        <ul className="space-y-1 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
          {pros.map((p) => (
            <li key={p} className="flex items-start gap-1.5">
              <Check className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-amber-400 mb-1 font-medium">
          단점 / 우려
        </div>
        <ul className="space-y-1 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
          {cons.map((c) => (
            <li key={c} className="flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ───────────────── Section E — 권장 조합 ───────────────── */

function SectionE_FinalRecommendation() {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-emerald-400" /> §E. 권장 조합 (선택 가능)
      </h2>
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <RecChip section="§A 메뉴" pick="A-1" desc={'"삭제" 한 단어 + 모달 분기'} />
          <RecChip section="§B 모달" pick="B-1" desc={'"보관 / 완전 삭제" 옵션 카드'} />
          <RecChip section="§D 목록" pick="D-1" desc="활성 / 보관함 탭" />
        </div>
        <div className="rounded-md bg-[var(--color-bg-secondary)]/60 px-3 py-2.5 text-[12px] text-[var(--color-text-secondary)] leading-relaxed mb-3">
          <strong>단어 정리:</strong>{" "}
          메뉴 <code className="px-1 rounded bg-[var(--color-bg-tertiary)]">삭제</code> /
          모달 옵션 <code className="px-1 rounded bg-[var(--color-bg-tertiary)]">보관</code>
          <code className="px-1 rounded bg-[var(--color-bg-tertiary)]">완전 삭제</code> /
          목록 탭 <code className="px-1 rounded bg-[var(--color-bg-tertiary)]">활성</code>
          <code className="px-1 rounded bg-[var(--color-bg-tertiary)]">보관함</code> /
          복구 액션 <code className="px-1 rounded bg-[var(--color-bg-tertiary)]">되살리기</code>
          (또는 그대로 \"복구\" — 데이터 복구는 별 섹션이라 충돌 X). \"토글\" 단어 모두 제거.
        </div>
        <div className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">
          본 mockup 의 alternative 중 어떤 조합을 채택할지 알려주시면 별도 구현 PR 로 진행합니다.
          A-1/B-1/D-1 조합 외 다른 조합 (예: A-2 + B-3 + D-2) 도 선택 가능 — 단어 일관성만
          맞추면 무방.
        </div>
      </div>
    </section>
  );
}

function RecChip({ section, pick, desc }: { section: string; pick: string; desc: string }) {
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-[var(--color-bg-primary)]/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
        {section}
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-[10px] text-emerald-300 font-mono">
          {pick}
        </span>
      </div>
      <div className="text-[11px] text-[var(--color-text-secondary)] leading-snug">{desc}</div>
    </div>
  );
}

/* ───────────────── Section F — 강사 정보 수정 disabled ───────────────── */

function SectionF_EditInfoDisabled() {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
        <UserCog className="w-5 h-5 text-violet-400" /> §F. "강사 정보 수정" 회색 — 어떻게 할까
      </h2>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        현재 settings/page.tsx:1490 의 <code>disabled: true</code> placeholder. 미구현이라 회색.
        3가지 처리 방향.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RecVariant
          number="F-1"
          recommended
          title="메뉴에서 제거"
          desc="구현 전까지 노출 X. 추가될 때 다시 노출. 침묵 disabled 의 혼란 회피."
          tone="emerald"
        />
        <RecVariant
          number="F-2"
          title={'"곧 출시" 라벨'}
          desc={'회색 disabled + 우측에 "곧 출시" pill. 사용자가 의도된 미구현임 인지.'}
          tone="amber"
        />
        <RecVariant
          number="F-3"
          title="강사 detail panel 로 이동"
          desc="클릭 가능 + /teachers/{id} 상세 페이지 열기 (이미 존재하는 detail). 이름/색상 등 인라인 편집."
          tone="sky"
        />
      </div>
    </section>
  );
}

function RecVariant({
  number,
  title,
  desc,
  tone,
  recommended,
}: {
  number: string;
  title: string;
  desc: string;
  tone: "emerald" | "amber" | "sky";
  recommended?: boolean;
}) {
  const borderClass =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/5"
        : "border-sky-500/30 bg-sky-500/5";
  return (
    <div className={`rounded-xl border ${borderClass} p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{number}</span>
        {recommended && (
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[9px] text-emerald-300 font-medium">
            추천
          </span>
        )}
      </div>
      <div className="font-medium text-sm mb-1.5">{title}</div>
      <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{desc}</p>
    </div>
  );
}
