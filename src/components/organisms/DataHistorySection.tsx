"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Lock, RotateCcw, Save, Trash2 } from "lucide-react";
import { listSnapshots } from "@/lib/snapshots/listSnapshots";
import { restoreSnapshot } from "@/lib/snapshots/restoreSnapshot";
import { createSnapshot } from "@/lib/snapshots/createSnapshot";
import type { DataSnapshotMeta, SnapshotType } from "@/lib/snapshots/types";
import { useMyPlan } from "@/hooks/useMyPlan";
import { useMyRole } from "@/hooks/useMyRole";
import { getActiveAcademyId, getClassPlannerData } from "@/lib/localStorageCrud";
import { showToast } from "@/lib/toast";
import ConfirmModal from "@/components/molecules/ConfirmModal";

interface DataHistorySectionProps {
  userId: string;
}

const TYPE_LABELS: Record<SnapshotType, string> = {
  before_conflict: "충돌 직전",
  auto_template: "템플릿 저장",
  manual: "수동 백업",
};

const TYPE_ACCENT: Record<SnapshotType, string> = {
  before_conflict: "text-amber-400",
  auto_template: "text-indigo-400",
  manual: "text-emerald-400",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function DataHistorySection({ userId }: DataHistorySectionProps) {
  const { canManage } = useMyRole();
  const plan = useMyPlan();
  const [expanded, setExpanded] = useState(false);
  const [snapshots, setSnapshots] = useState<DataSnapshotMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [creatingManual, setCreatingManual] = useState(false);

  const academyId = useMemo(
    () => (typeof window !== "undefined" ? getActiveAcademyId(userId) : null),
    [userId],
  );

  const fetchSnapshots = useCallback(async () => {
    if (!academyId) return;
    setLoading(true);
    const list = await listSnapshots(userId, academyId);
    setSnapshots(list);
    setLoading(false);
    setSelectedId((prev) => prev ?? (list[0]?.id ?? null));
  }, [academyId, userId]);

  useEffect(() => {
    if (expanded) void fetchSnapshots();
  }, [expanded, fetchSnapshots]);

  if (!canManage) return null;

  const isLocked = (snap: DataSnapshotMeta): boolean => {
    if (snap.snapshotType === "before_conflict") return false;
    if (snap.snapshotType === "manual") return plan.tier !== "pro";
    if (snap.snapshotType === "auto_template") {
      const autos = snapshots
        .filter((s) => s.snapshotType === "auto_template")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const idx = autos.findIndex((s) => s.id === snap.id);
      return idx >= plan.autoSnapshotRestoreSlots;
    }
    return false;
  };

  const selected = snapshots.find((s) => s.id === selectedId) ?? null;
  const selectedLocked = selected ? isLocked(selected) : false;

  const handleRestore = async () => {
    if (!selected || !academyId || selectedLocked) return;
    setIsRestoring(true);
    const result = await restoreSnapshot(userId, academyId, selected.id, getClassPlannerData());
    setIsRestoring(false);
    setConfirmRestoreId(null);
    if (result.success) {
      showToast("success", "데이터가 복원됐습니다. 페이지를 새로고침해 주세요.");
      void fetchSnapshots();
    } else {
      showToast("error", result.error ?? "복원 실패");
    }
  };

  const handleManualBackup = async () => {
    if (!academyId) return;
    if (plan.tier !== "pro") {
      showToast("info", "수동 백업은 프리미엄 출시 후 사용 가능합니다.");
      return;
    }
    setCreatingManual(true);
    const result = await createSnapshot(userId, academyId, {
      type: "manual",
      payload: getClassPlannerData(),
      description: `수동 백업 ${new Date().toLocaleString("ko-KR")}`,
    });
    setCreatingManual(false);
    if (result.success) {
      showToast("success", "백업이 생성됐습니다.");
      void fetchSnapshots();
    } else {
      showToast("error", result.error ?? "백업 생성 실패");
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId || !academyId) return;
    const res = await fetch(
      `/api/data-snapshots/${encodeURIComponent(confirmDeleteId)}?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    );
    setConfirmDeleteId(null);
    if (res.ok) {
      showToast("success", "백업이 삭제됐습니다.");
      if (selectedId === confirmDeleteId) setSelectedId(null);
      void fetchSnapshots();
    } else {
      showToast("error", "삭제 실패");
    }
  };

  return (
    <section className="bg-[var(--color-bg-secondary)] rounded-xl mt-4 border border-[var(--color-border)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--color-bg-primary)]/50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">데이터 이력</h2>
          {snapshots.length > 0 && (
            <span className="text-xs rounded-full bg-[var(--color-overlay-light)] px-2 py-0.5 text-[var(--color-text-muted)]">
              {snapshots.length}개
            </span>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`text-[var(--color-text-muted)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-5">
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            충돌 직전·템플릿 저장 직후·수동 백업이 자동 저장됩니다. 잘못된 충돌 선택 등 사고 시 여기서 복원하세요.
            {plan.tier === "free" && (
              <>
                {" "}
                <span className="text-amber-400">
                  (무료: 충돌 백업 무제한 복구 + 일반 자동 백업 최근 {plan.autoSnapshotRestoreSlots}건 복구. 그 외는 미리보기만)
                </span>
              </>
            )}
          </p>

          {/* 수동 백업 버튼 */}
          <button
            type="button"
            onClick={handleManualBackup}
            disabled={creatingManual || !academyId}
            className={`mb-4 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              plan.tier === "pro"
                ? "border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
                : "border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            } disabled:opacity-50`}
          >
            {plan.tier === "pro" ? <Save size={14} /> : <Lock size={14} />}
            {creatingManual ? "백업 중..." : plan.tier === "pro" ? "지금 백업" : "지금 백업 (프리미엄 곧 출시)"}
          </button>

          {/* Master-Detail */}
          <div className="flex gap-3 max-md:flex-col">
            {/* 왼쪽 list */}
            <div className="md:w-2/5 flex flex-col gap-1 max-h-[400px] overflow-y-auto">
              {loading && (
                <div className="text-xs text-[var(--color-text-muted)] py-3 text-center">불러오는 중...</div>
              )}
              {!loading && snapshots.length === 0 && (
                <div className="text-xs text-[var(--color-text-muted)] py-6 text-center border border-dashed border-[var(--color-border)] rounded-lg">
                  아직 백업이 없습니다. 시간표 변경 시 자동 생성됩니다.
                </div>
              )}
              {snapshots.map((snap) => {
                const locked = isLocked(snap);
                const isSelected = selectedId === snap.id;
                return (
                  <button
                    key={snap.id}
                    type="button"
                    onClick={() => setSelectedId(snap.id)}
                    className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                        : "border-[var(--color-border)] hover:bg-[var(--color-bg-primary)]"
                    } ${locked ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                      <span className={TYPE_ACCENT[snap.snapshotType]}>
                        {TYPE_LABELS[snap.snapshotType]}
                      </span>
                      {locked && <Lock size={10} className="text-[var(--color-text-muted)]" />}
                    </div>
                    <div className="text-xs text-[var(--color-text-primary)]">{formatDate(snap.createdAt)}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">
                      학생 {snap.counts.students} · 과목 {snap.counts.subjects} · 수업 {snap.counts.sessions}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 오른쪽 detail */}
            <div className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
              {!selected ? (
                <div className="text-sm text-[var(--color-text-muted)] text-center py-8">
                  왼쪽에서 백업을 선택하세요
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-sm font-semibold ${TYPE_ACCENT[selected.snapshotType]}`}>
                      {TYPE_LABELS[selected.snapshotType]}
                    </h3>
                    {selectedLocked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-overlay-light)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                        <Lock size={9} />
                        프리미엄
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mb-3">{formatDate(selected.createdAt)}</div>
                  {selected.description && (
                    <div className="text-xs text-[var(--color-text-secondary)] mb-3 italic">{selected.description}</div>
                  )}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <Stat label="학생" value={selected.counts.students} />
                    <Stat label="과목" value={selected.counts.subjects} />
                    <Stat label="수업" value={selected.counts.sessions} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedLocked) {
                          showToast("info", "프리미엄 출시 후 복원 가능합니다.");
                          return;
                        }
                        setConfirmRestoreId(selected.id);
                      }}
                      disabled={selectedLocked}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        selectedLocked
                          ? "bg-[var(--color-overlay-light)] text-[var(--color-text-muted)] cursor-not-allowed"
                          : "bg-[var(--color-accent)] text-white hover:opacity-90"
                      }`}
                    >
                      {selectedLocked ? <Lock size={13} /> : <RotateCcw size={13} />}
                      {selectedLocked ? "프리미엄 곧 출시" : "이 백업으로 복원"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(selected.id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] transition-colors"
                      aria-label="이 백업 삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmRestoreId !== null}
        title="이 백업으로 복원할까요?"
        message={
          selected
            ? `학생 ${selected.counts.students}명 · 과목 ${selected.counts.subjects}개 · 수업 ${selected.counts.sessions}개로 덮어씁니다. 현재 데이터는 복원 직전 자동 백업되어 다시 되돌릴 수 있습니다.`
            : ""
        }
        confirmText={isRestoring ? "복원 중..." : "복원"}
        cancelText="취소"
        variant="danger"
        onConfirm={handleRestore}
        onCancel={() => setConfirmRestoreId(null)}
      />

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="이 백업을 삭제할까요?"
        message="이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--color-bg-secondary)] px-2 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</div>
      <div className="text-base font-bold text-[var(--color-text-primary)] tabular-nums">{value}</div>
    </div>
  );
}
