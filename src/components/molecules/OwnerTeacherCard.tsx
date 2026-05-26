"use client";

import { Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRole } from "@/hooks/useMyRole";
import { useIntegratedDataLocal } from "@/hooks/useIntegratedDataLocal";

interface OwnerTeacherCardProps {
  /**
   * "과목 변경" 버튼 클릭 핸들러. 부모에서 SubjectPickModal 등 연결 (Part 2).
   * 미제공 시 버튼 숨김 (Part 1 — UI only).
   */
  onChangeSubjects?: () => void;
}

export function OwnerTeacherCard({ onChangeSubjects }: OwnerTeacherCardProps = {}) {
  const { role, linkedTeacherId } = useMyRole();
  const { session } = useAuth();
  const { data } = useIntegratedDataLocal();

  if (role !== "owner") return null;
  if (!linkedTeacherId) return null;

  const teachers = data?.teachers ?? [];
  const subjects = data?.subjects ?? [];
  const ownerTeacher = teachers.find((t) => t.id === linkedTeacherId);
  if (!ownerTeacher) return null;

  const ownerSubjectIds = ownerTeacher.subjectIds ?? [];
  const ownerSubjects = subjects.filter((s) => ownerSubjectIds.includes(s.id));
  const displayName =
    ownerTeacher.name || session?.user?.email?.split("@")[0] || "원장님";

  return (
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
            <span className="text-[11px] text-emerald-300 ml-auto shrink-0">
              ✓ 직접 수업 가능
            </span>
          </div>
          <div className="text-[11px] text-amber-200/60 mt-0.5">
            별도 등록 없이 자동으로 강사 목록에 표시돼요
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
          {onChangeSubjects && (
            <button
              type="button"
              onClick={onChangeSubjects}
              className="px-2 py-0.5 text-[11px] text-amber-300 hover:bg-amber-500/15 rounded transition-colors"
              data-testid="owner-change-subjects"
            >
              과목 변경
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
