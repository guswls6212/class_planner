"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRole } from "@/hooks/useMyRole";
import { useIntegratedDataLocal } from "@/hooks/useIntegratedDataLocal";
import { useTeacherManagementLocal } from "@/hooks/useTeacherManagementLocal";
import { showError, showSuccess } from "@/lib/toast";
import { SubjectPickModal } from "./SubjectPickModal";

export function OwnerTeacherCard() {
  const { role, linkedTeacherId } = useMyRole();
  const { session } = useAuth();
  const { data } = useIntegratedDataLocal();
  const { addTeacherSubject, removeTeacherSubject } = useTeacherManagementLocal();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (role !== "owner") return null;

  const teachers = data?.teachers ?? [];
  const subjects = data?.subjects ?? [];
  const ownerTeacher = linkedTeacherId
    ? teachers.find((t) => t.id === linkedTeacherId)
    : null;
  const ownerSubjectIds = ownerTeacher?.subjectIds ?? [];
  const ownerSubjects = subjects.filter((s) => ownerSubjectIds.includes(s.id));
  const displayName =
    ownerTeacher?.name ||
    session?.user?.email?.split("@")[0] ||
    "원장님";

  const handleSaveSubjects = async (selectedIds: string[]) => {
    const ownerUserId = session?.user?.id;
    if (!ownerUserId) {
      showError("로그인 정보를 확인해주세요");
      return;
    }

    if (linkedTeacherId) {
      const toAdd = selectedIds.filter((id) => !ownerSubjectIds.includes(id));
      const toRemove = ownerSubjectIds.filter((id) => !selectedIds.includes(id));
      for (const subId of toAdd) {
        await addTeacherSubject(linkedTeacherId, subId);
      }
      for (const subId of toRemove) {
        await removeTeacherSubject(linkedTeacherId, subId);
      }
      showSuccess("담당 과목이 저장됐어요");
      return;
    }

    try {
      const res = await fetch(
        `/api/teachers/owner-link?userId=${encodeURIComponent(ownerUserId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName,
            color: "#fbbf24",
            subjectIds: selectedIds,
          }),
        },
      );
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => ({}))) as { error?: string };
        showError(errorBody.error ?? "원장 강사 등록에 실패했어요");
        return;
      }
      showSuccess("원장님 강사 등록 완료! 새로고침하면 강사 목록에 반영돼요");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("class-planner:academy-changed"));
      }
    } catch {
      showError("원장 강사 등록에 실패했어요");
    }
  };

  return (
    <>
      <section
        data-testid="owner-teacher-card"
        className="mx-4 mt-3 rounded-xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4 space-y-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-amber-200 truncate">
                원장님 ({displayName})
              </span>
              <span className="px-1.5 py-0.5 bg-amber-500/30 text-amber-200 text-[10px] rounded-full font-mono shrink-0">
                원장
              </span>
              {ownerTeacher && (
                <span
                  className="text-[11px] text-emerald-300 ml-auto shrink-0"
                  data-testid="owner-direct-teach-badge"
                >
                  ✓ 직접 수업 가능
                </span>
              )}
            </div>
            <div className="text-[11px] text-amber-200/60 mt-0.5">
              {ownerTeacher
                ? "별도 등록 없이 자동으로 강사 목록에 표시돼요"
                : "담당 과목을 설정하면 강사 목록에 표시돼요"}
            </div>
          </div>
        </div>

        <div className="border-t border-amber-500/20 pt-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-amber-200/80">담당 과목:</span>
              {ownerSubjects.length === 0 ? (
                <span className="text-[11px] text-amber-200/60 italic">
                  아직 설정 안 됨
                </span>
              ) : (
                ownerSubjects.map((s) => (
                  <span
                    key={s.id}
                    className="px-2 py-0.5 rounded-full text-[11px] text-zinc-900 font-medium"
                    style={{ backgroundColor: s.color }}
                    data-testid={`owner-subject-${s.id}`}
                  >
                    {s.name}
                  </span>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-2 py-0.5 text-[11px] text-amber-300 hover:bg-amber-500/15 rounded transition-colors"
              data-testid="owner-change-subjects"
            >
              과목 변경
            </button>
          </div>
        </div>
      </section>

      <SubjectPickModal
        open={isModalOpen}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name, color: s.color ?? "#999999" }))}
        initialSelectedIds={ownerSubjectIds}
        onSave={handleSaveSubjects}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
