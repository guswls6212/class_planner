"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { UserPlus, Link2, Plus, Pencil, MoreHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import { logger } from "../../lib/logger";
import { showError, showSuccess, showToast } from "../../lib/toast";
import { getClassPlannerData } from "../../lib/localStorageCrud";
import { Button } from "../../components/atoms/Button";
import { TeacherStatusPill } from "../../components/atoms/TeacherStatusPill";
import type { TeacherWithStatus } from "../api/teachers/route";
import { formatExpiry, getExpiryColorClass } from "../../lib/formatExpiry";
import InviteModal from "../../components/molecules/InviteModal";
import { TeacherAddModal } from "../../components/molecules/TeacherAddModal";
import type { Member } from "../../components/molecules/MemberListItem";

interface PendingInvite {
  id: string;
  token: string;
  role: string;
  expiresAt: string;
  teacherId: string | null;
  teacherName: string | null;
}

interface ShareToken {
  id: string;
  token: string;
  label: string | null;
  filter_student_id: string | null;
  expires_at: string;
  created_at: string;
  access_code?: string | null;
}

interface AccessCodeEntry {
  id: string;
  label: string;
  filter_student_id: string | null;
  access_code: string;
  expires_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [hasAcademy, setHasAcademy] = useState<boolean | null>(null);
  const [academyName, setAcademyName] = useState("");
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [academySlug, setAcademySlug] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  // Slug editor state
  const [editSlugValue, setEditSlugValue] = useState("");
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [isSavingSlug, setIsSavingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugCheckLoading, setSlugCheckLoading] = useState(false);
  const [slugImpactConfirmed, setSlugImpactConfirmed] = useState(false);
  const slugCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSlugTriedRef = useRef(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [teachers, setTeachers] = useState<TeacherWithStatus[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [myRole, setMyRole] = useState<string>("member");
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTargetTeacherId, setInviteTargetTeacherId] = useState<string | null>(null);
  const [inviteTargetTeacherName, setInviteTargetTeacherName] = useState<string | null>(null);
  const [addTeacherOpen, setAddTeacherOpen] = useState(false);

  // 공유 링크
  const [shareTokens, setShareTokens] = useState<ShareToken[]>([]);
  const [shareExpanded, setShareExpanded] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLabel, setShareLabel] = useState("");
  const [shareExpiresInDays, setShareExpiresInDays] = useState(30);
  const [shareStudentId, setShareStudentId] = useState("");
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [localStudents, setLocalStudents] = useState<Array<{ id: string; name: string }>>([]);

  // 학부모 접속 코드
  const [accessCodes, setAccessCodes] = useState<AccessCodeEntry[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      setUserId(session.user.id);
    });
  }, [router]);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [membersRes, teachersRes, invitesRes, shareRes] = await Promise.all([
        fetch(`/api/members?userId=${userId}`),
        fetch(`/api/teachers?userId=${userId}`),
        fetch(`/api/invites?userId=${userId}`),
        fetch(`/api/share-tokens?userId=${userId}`),
      ]);

      if (membersRes.ok) {
        const { data, hasAcademy: ha, academyName: an, academyId: aid, academySlug: aslug } = await membersRes.json();
        setHasAcademy(ha ?? true);
        setAcademyName(an ?? "");
        setAcademyId(aid ?? null);
        setAcademySlug(aslug ?? null);
        setMembers(data ?? []);
        const me = (data ?? []).find((m: Member) => m.userId === userId);
        if (me) setMyRole(me.role);

        // Auto-generate slug on first load if missing (background, silent, only once).
        // Owner/admin only — non-managers cannot PATCH and would just hit 403.
        const meRow = (data ?? []).find((m: Member) => m.userId === userId);
        const meRole = meRow?.role;
        if (!aslug && an && userId && !autoSlugTriedRef.current && meRole === "owner") {
          autoSlugTriedRef.current = true;
          import("@/lib/slug").then(({ generateSlug }) => {
            const autoSlug = generateSlug(an);
            if (!autoSlug) return;
            fetch(`/api/academies/slug?userId=${userId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug: autoSlug }),
            })
              .then(async (res) => {
                if (res.ok) {
                  const body = await res.json().catch(() => ({}));
                  if (body?.slug) setAcademySlug(body.slug);
                }
              })
              .catch(() => {});
          });
        }
      } else {
        // API 서버 오류 — hasAcademy를 false로 바꾸지 않음
        // 일시적 오류로 "학원 만들기" 화면이 표시되는 것을 방지
        showError("멤버 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }

      if (teachersRes.ok) {
        const { data } = await teachersRes.json();
        setTeachers(data ?? []);
      }

      if (invitesRes.ok) {
        const { data } = await invitesRes.json();
        setInvites(data ?? []);
      }

      if (shareRes.ok) {
        const { data } = await shareRes.json();
        const allTokens = (data ?? []) as ShareToken[];
        // Split: access codes (have access_code) vs regular share tokens
        setAccessCodes(
          allTokens
            .filter((t) => Boolean(t.access_code))
            .map((t) => ({
              id: t.id,
              label: t.label ?? "",
              filter_student_id: t.filter_student_id,
              access_code: t.access_code as string,
              expires_at: t.expires_at,
            }))
        );
        setShareTokens(allTokens.filter((t) => !t.access_code));
      }
    } catch (err) {
      logger.error("설정 데이터 로드 실패", undefined, err as Error);
      showError("설정 데이터 로드에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchData();
  }, [userId, fetchData]);

  useEffect(() => {
    if (shareTokens.length > 0) setShareExpanded(true);
  }, [shareTokens.length]);

  const checkSlugDebounced = useCallback((slug: string, currentSlug: string) => {
    if (slugCheckTimerRef.current) clearTimeout(slugCheckTimerRef.current);
    if (!slug || slug === currentSlug) {
      setSlugAvailable(null);
      setSlugCheckLoading(false);
      return;
    }
    setSlugCheckLoading(true);
    slugCheckTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/academies/check-slug?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        setSlugAvailable(Boolean(data.available));
      } catch {
        setSlugAvailable(null);
      } finally {
        setSlugCheckLoading(false);
      }
    }, 500);
  }, []);

  const handleSaveSlug = async () => {
    if (!userId) return;
    setIsSavingSlug(true);
    try {
      const res = await fetch(`/api/academies/slug?userId=${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: editSlugValue }),
      });
      if (res.ok) {
        showToast("success", "URL이 변경됐습니다.");
        setIsEditingSlug(false);
        setSlugImpactConfirmed(false);
        setSlugAvailable(null);
        await fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast("error", (err as { error?: string }).error ?? "URL 변경 실패");
      }
    } catch {
      showToast("error", "URL 변경 실패");
    } finally {
      setIsSavingSlug(false);
    }
  };

  const handleSaveAcademyName = async () => {
    if (!userId || !editNameValue.trim()) return;
    setIsSavingName(true);
    try {
      const res = await fetch(`/api/academies?userId=${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editNameValue.trim() }),
      });
      if (res.ok) {
        setAcademyName(editNameValue.trim());
        setIsEditingName(false);
      } else {
        showError("학원 이름 변경에 실패했습니다.");
      }
    } catch {
      showError("학원 이름 변경 중 오류가 발생했습니다.");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCopyShareLink = async (link: string) => {
    if (typeof window !== "undefined" && window.navigator?.clipboard) {
      await window.navigator.clipboard.writeText(link);
    }
  };

  // 통합 강사 목록 액션 핸들러
  const handleTeacherAction = useCallback(
    async (action: string, teacherId: string) => {
      if (!userId) return;
      const invite = invites.find((i) => i.teacherId === teacherId);

      switch (action) {
        case "copy_invite": {
          if (!invite) {
            showError("초대 링크를 찾을 수 없습니다. 다시 시도해 주세요.");
            return;
          }
          const link = `${window.location.origin}/invite/${invite.token}`;
          if (typeof window !== "undefined" && window.navigator?.clipboard) {
            await window.navigator.clipboard.writeText(link);
            showSuccess("초대 링크가 복사되었습니다");
          }
          break;
        }
        case "cancel_invite": {
          if (!invite) return;
          if (!confirm("이 초대를 취소하시겠습니까?")) return;
          const res = await fetch(`/api/invites/${invite.id}?userId=${userId}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            showError("초대 취소에 실패했습니다. 다시 시도해 주세요.");
            return;
          }
          await fetchData();
          break;
        }
        case "invite":
        case "reinvite": {
          // Pre-select the teacher so InviteModal skips the redundant dropdown
          const teacher = teachers.find((t) => t.id === teacherId);
          setInviteTargetTeacherId(teacherId);
          setInviteTargetTeacherName(teacher?.name ?? null);
          setShowInviteModal(true);
          break;
        }
        case "change_role": {
          const teacher = teachers.find((t) => t.id === teacherId);
          if (!teacher) return;

          // 가입되지 않은 강사(teacher.userId === null)는 변경할 academy_members 행이 없음.
          if (!teacher.userId) {
            showToast("info", "가입된 강사에게만 역할을 변경할 수 있습니다");
            return;
          }

          const targetMember = members.find((m) => m.userId === teacher.userId);
          if (!targetMember) {
            showError("멤버 정보를 찾을 수 없습니다. 페이지를 새로 고침해 주세요.");
            return;
          }

          // owner는 PATCH API에서 410으로 거부되지만, UX상 클라이언트에서 먼저 막는다.
          if (targetMember.role === "owner") {
            showError("원장의 권한은 변경할 수 없습니다.");
            return;
          }

          // admin ↔ member 토글. 다른 role은 정의되어 있지 않다.
          const nextRole = targetMember.role === "admin" ? "member" : "admin";
          const nextLabel = nextRole === "admin" ? "관리자" : "강사";
          const teacherDisplay = teacher.name || teacher.email || "이 멤버";

          if (!confirm(`${teacherDisplay}의 권한을 '${nextLabel}'로 변경하시겠습니까?`)) {
            return;
          }

          const res = await fetch(
            `/api/members/${teacher.userId}?userId=${userId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: nextRole }),
            }
          );

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            const errMessage =
              (errBody as { error?: string | { message?: string } })?.error;
            const message =
              typeof errMessage === "string"
                ? errMessage
                : errMessage?.message ?? "권한 변경에 실패했습니다.";
            showError(message);
            return;
          }

          showSuccess(`권한이 '${nextLabel}'(으)로 변경되었습니다`);
          await fetchData();
          break;
        }
        default:
          // share_link / promote_to_invite / kick / edit_teacher / delete 등은
          // Plan B에서 구현 예정
          showToast("info", "준비 중입니다");
          logger.debug("Teacher action not yet implemented", { action, teacherId });
      }
    },
    [userId, invites, fetchData, teachers, members]
  );

  // 로컬 학생 목록 로드 (공유 링크 학생 필터용)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const { students } = getClassPlannerData();
      setLocalStudents(students.map((s) => ({ id: s.id, name: s.name })));
    }
  }, []);

  const handleCreateShareToken = async () => {
    if (!userId) return;
    setIsCreatingShare(true);
    try {
      const res = await fetch(`/api/share-tokens?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: shareLabel || null,
          filterStudentId: shareStudentId || null,
          expiresInDays: shareExpiresInDays,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const token = data.data?.token;
        if (token && typeof window !== "undefined" && window.navigator?.clipboard) {
          const shareUrl = `${window.location.origin}/share/${token}`;
          try {
            await window.navigator.clipboard.writeText(shareUrl);
          } catch {
            // Clipboard write may fail (e.g. permissions); proceed regardless.
          }
        }
        showToast("success", "시간표 공유 링크가 복사됐습니다");
        setShowShareModal(false);
        setShareLabel("");
        setShareStudentId("");
        setShareExpiresInDays(30);
        await fetchData();
      } else {
        showError(data.error ?? "공유 링크 생성에 실패했습니다.");
      }
    } catch (err) {
      logger.error("공유 링크 생성 실패", undefined, err as Error);
      showError("공유 링크 생성에 실패했습니다.");
    } finally {
      setIsCreatingShare(false);
    }
  };

  const handleRevokeShareToken = async (id: string) => {
    if (!userId || !confirm("이 공유 링크를 취소하시겠습니까?")) return;
    await fetch(`/api/share-tokens/${id}?userId=${userId}`, { method: "DELETE" });
    await fetchData();
  };

  const handleCreateAccessCodes = async () => {
    if (!userId) return;
    const res = await fetch(`/api/share-tokens/access-codes?userId=${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "create" }),
    });
    if (res.ok) {
      const data = await res.json();
      if ((data.created ?? 0) > 0) {
        showToast("success", `${data.created}명의 접속 코드가 생성됐습니다.`);
      } else {
        showToast("info", "모든 학생에게 이미 코드가 있습니다.");
      }
      await fetchData();
    } else {
      showToast("error", "코드 생성에 실패했습니다.");
    }
  };

  const handleRenewAccessCodes = async () => {
    if (!userId) return;
    if (typeof window !== "undefined" && !window.confirm("모든 접속 코드를 새로 발급할까요? 기존 코드는 즉시 만료됩니다.")) return;
    const res = await fetch(`/api/share-tokens/access-codes?userId=${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "renew" }),
    });
    if (res.ok) {
      showToast("success", "모든 접속 코드가 갱신됐습니다.");
      await fetchData();
    } else {
      showToast("error", "코드 갱신에 실패했습니다.");
    }
  };

  const canManage = myRole === "owner" || myRole === "admin";

  // 원장(owner) 멤버 — 통합 강사 목록 상단에 별도 행으로 표시
  const ownerMember = members.find((m) => m.role === "owner") ?? null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">불러오는 중...</p>
      </div>
    );
  }

  if (hasAcademy === false) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">학원 설정</h1>
        <div className="bg-[var(--color-bg-secondary)] rounded-xl p-10 border border-[var(--color-border)] flex flex-col items-center gap-4 text-center">
          <p className="text-[var(--color-text-secondary)] text-sm">
            아직 등록된 학원이 없습니다.
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            학원을 먼저 만들어야 멤버 초대와 공유 링크를 사용할 수 있습니다.
          </p>
          <Button variant="accent" onClick={() => router.push("/onboarding")} className="mt-2">
            학원 만들기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">학원 설정</h1>

      {/* 학원 이름 섹션 — hasAcademy는 위 early return에서 보장됨. academyName 조건 제거. */}
      <section className="bg-[var(--color-bg-secondary)] rounded-xl p-5 mb-4 border border-[var(--color-border)]">
          <div className="flex items-center justify-between gap-3">
            {isEditingName ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSaveAcademyName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  autoFocus
                  maxLength={50}
                  className="flex-1 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <Button
                  variant="accent"
                  size="small"
                  onClick={handleSaveAcademyName}
                  loading={isSavingName}
                >
                  저장
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setIsEditingName(false)}
                >
                  취소
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-[11px] text-[var(--color-text-muted)] mb-0.5">학원 이름</p>
                  <p className="text-base font-semibold text-[var(--color-text-primary)]">{academyName}</p>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => { setEditNameValue(academyName); setIsEditingName(true); }}
                    aria-label="학원 이름 편집"
                  >
                    <Pencil size={15} strokeWidth={1.5} />
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Slug 편집 섹션 */}
          {myRole === 'owner' && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[var(--color-text-muted)]">학부모 접속 URL</span>
                {!isEditingSlug && (
                  <button
                    onClick={() => {
                      setEditSlugValue(academySlug ?? "");
                      setIsEditingSlug(true);
                      setSlugAvailable(null);
                      setSlugImpactConfirmed(false);
                    }}
                    className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors rounded"
                    aria-label="slug 편집"
                  >
                    <Pencil size={13} strokeWidth={1.5} />
                  </button>
                )}
              </div>

              {!isEditingSlug ? (
                <p className="text-sm font-mono text-[var(--color-text-primary)]">
                  {academySlug
                    ? `/academy/${academySlug}`
                    : <span className="text-[var(--color-text-muted)] italic text-xs">slug 미설정 — 편집 버튼으로 설정하세요</span>
                  }
                </p>
              ) : (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">/academy/</span>
                    <input
                      value={editSlugValue}
                      onChange={(e) => {
                        setEditSlugValue(e.target.value);
                        setSlugImpactConfirmed(false);
                        checkSlugDebounced(e.target.value, academySlug ?? "");
                      }}
                      className="flex-1 border border-[var(--color-border)] rounded-md px-2 py-1.5 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent font-mono min-w-0"
                      placeholder="학원명"
                    />
                    <span className="text-xs flex-shrink-0 w-16 text-right">
                      {slugCheckLoading && <span className="text-[var(--color-text-muted)]">확인 중</span>}
                      {!slugCheckLoading && slugAvailable === true && <span className="text-emerald-400">✓ 가능</span>}
                      {!slugCheckLoading && slugAvailable === false && <span className="text-red-400">✗ 중복</span>}
                    </span>
                  </div>

                  {/* 변경 영향 경고 — 기존 slug가 있고 새 값이 다를 때 */}
                  {academySlug && editSlugValue !== academySlug && (
                    <div className="rounded-lg bg-yellow-900/20 border border-yellow-700/40 px-3 py-2.5 mb-3">
                      <p className="text-xs text-yellow-400 font-semibold mb-1">⚠️ URL 변경 시 영향</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        부모님들이 저장한 <code className="bg-slate-800 px-1 py-0.5 rounded text-[10px] font-mono">/academy/{academySlug}</code> 링크가 자동으로 새 URL로 연결됩니다.
                      </p>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={slugImpactConfirmed}
                          onChange={(e) => setSlugImpactConfirmed(e.target.checked)}
                          className="accent-amber-500 w-3.5 h-3.5"
                        />
                        <span className="text-xs text-slate-400">위 내용을 확인했습니다</span>
                      </label>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveSlug}
                      disabled={
                        isSavingSlug ||
                        !editSlugValue ||
                        slugAvailable === false ||
                        slugCheckLoading ||
                        // Guard: input changed but availability check not yet done
                        (editSlugValue !== (academySlug ?? '') && slugAvailable === null && !slugCheckLoading) ||
                        // If changing existing slug, require confirmation
                        (
                          !!academySlug &&
                          editSlugValue !== academySlug &&
                          !slugImpactConfirmed
                        )
                      }
                      className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-accent text-[var(--color-admin-ink)] disabled:opacity-40 transition-opacity"
                    >
                      {isSavingSlug ? "저장 중..." : "저장"}
                    </button>
                    <button
                      onClick={() => { setIsEditingSlug(false); setSlugAvailable(null); }}
                      className="flex-1 py-1.5 rounded-md text-xs border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

      {/* 통합 팀 섹션 — 원장 + 강사 전체 (상태 pill 포함) */}
      <section className="bg-[var(--color-bg-secondary)] rounded-xl p-5 mb-4 border border-[var(--color-border)]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
              <UserPlus size={18} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                팀{" "}
                <span className="text-[11px] font-normal text-[var(--color-text-muted)] ml-1">
                  {teachers.length + (ownerMember ? 1 : 0)}명
                </span>
              </h2>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                강사를 초대해 시간표를 함께 편집하세요
              </p>
            </div>
          </div>
          {canManage && (
            <Button
              variant="accent"
              size="small"
              onClick={() => setAddTeacherOpen(true)}
              className="flex-shrink-0 gap-1.5"
            >
              <Plus size={14} strokeWidth={2} /> 강사 추가
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {/* 원장(현재 사용자) — 항상 상단 */}
          {ownerMember && (
            <OwnerRow
              member={ownerMember}
              isMe={ownerMember.userId === userId}
              canViewEmail={canManage || ownerMember.userId === userId}
            />
          )}

          {/* 강사 목록 — 상태 pill + 액션 */}
          {teachers.map((teacher) => (
            <TeacherRow
              key={teacher.id}
              teacher={teacher}
              invites={invites}
              canManage={canManage}
              currentUserId={userId}
              onAction={handleTeacherAction}
            />
          ))}

          {teachers.length === 0 && (
            <p className="text-[12px] text-[var(--color-text-muted)] text-center py-3">
              아직 등록된 강사가 없습니다.
            </p>
          )}
        </div>
      </section>

      {/* 학부모 접속 코드 섹션 */}
      {canManage && (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden mt-4">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">학부모 접속 코드</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                학부모가 자녀 시간표를 볼 수 있는 코드입니다 (코드는 6자 영문·숫자)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRenewAccessCodes}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:border-[var(--color-accent)] transition-colors"
              >
                ↻ 전체 갱신
              </button>
              <button
                onClick={handleCreateAccessCodes}
                className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-admin-ink)]"
              >
                코드 생성
              </button>
            </div>
          </div>

          {accessCodes.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">
              코드가 없습니다.{" "}
              <button onClick={handleCreateAccessCodes} className="text-[var(--color-accent)] underline">
                코드 생성하기
              </button>
            </div>
          ) : (
            <div>
              {accessCodes.map((code) => {
                // Extract student name from label: "이현진 학부모 접속 코드" → "이현진"
                const studentName = code.label?.replace(" 학부모 접속 코드", "") || "알 수 없음";
                const daysLeft = Math.ceil(
                  (new Date(code.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={code.id}
                    className="flex items-center gap-3 px-6 py-3 border-b border-[var(--color-border)] last:border-0"
                  >
                    <span className="w-24 flex-shrink-0 text-sm font-semibold text-[var(--color-text-primary)]">
                      {studentName}
                    </span>
                    <span className="font-mono text-base font-bold tracking-wider text-[var(--color-accent)]">
                      {code.access_code}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">D-{daysLeft}</span>
                    <button
                      onClick={() => {
                        if (typeof window === "undefined") return;
                        const identifier = academySlug ?? academyId ?? "";
                        const url = `${window.location.origin}/academy/${identifier}`;
                        window.navigator.clipboard?.writeText(`${url}\n코드: ${code.access_code}`);
                        showToast("success", `${studentName} 코드가 복사됐습니다`);
                      }}
                      disabled={!academyId && !academySlug}
                      className={`ml-auto text-xs border border-[var(--color-border)] rounded px-2 py-1 transition-colors ${
                        academyId || academySlug
                          ? 'text-[var(--color-text-muted)] hover:border-[var(--color-accent)] cursor-pointer'
                          : 'opacity-40 cursor-not-allowed'
                      }`}
                    >
                      URL+코드 복사
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
            <p className="text-xs text-[var(--color-text-muted)]">
              학부모 접속 URL:{" "}
              <span className="font-mono text-[var(--color-accent)]">
                {typeof window !== "undefined" ? window.location.origin : ""}/academy/{academySlug ?? academyId ?? ""}
              </span>
            </p>
          </div>
        </section>
      )}

      {/* 공유 링크 섹션 — 아코디언 */}
      {canManage && (
        <section className="bg-[var(--color-bg-secondary)] rounded-xl mt-4 border border-[var(--color-border)] overflow-hidden">
          {/* 아코디언 헤더 — 항상 표시 */}
          <div
            role="button"
            tabIndex={0}
            aria-expanded={shareExpanded}
            onClick={() => setShareExpanded((v) => !v)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShareExpanded((v) => !v); } }}
            className="w-full flex items-start justify-between gap-3 p-5 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-t-xl"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-400/15 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <Link2 size={18} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  고급 공유 옵션{" "}
                  {shareTokens.length > 0 && (
                    <span className="text-[11px] font-normal text-[var(--color-text-muted)] ml-1">
                      {shareTokens.length}개
                    </span>
                  )}
                </h2>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                  강사 시간표, 임시 공개, 학원 전체 공유 등 고급 공유 옵션
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
              {shareExpanded && (
                <Button
                  variant="accent"
                  size="small"
                  onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }}
                  className="gap-1.5"
                >
                  <Plus size={14} strokeWidth={2} /> 링크 만들기
                </Button>
              )}
              {shareExpanded
                ? <ChevronUp size={16} className="text-[var(--color-text-muted)]" />
                : <ChevronDown size={16} className="text-[var(--color-text-muted)]" />
              }
            </div>
          </div>

          {/* 힌트 텍스트 — 닫힌 상태 + 토큰 0개 */}
          {!shareExpanded && shareTokens.length === 0 && (
            <p className="px-5 pb-4 text-[11px] text-[var(--color-text-muted)]">
              일반 학부모 공유는 위의 &apos;학부모 접속 코드&apos;를 사용하세요.
            </p>
          )}

          {/* 아코디언 컨텐츠 — 열린 상태 */}
          {shareExpanded && (
            <div className="px-5 pb-5">
              {shareTokens.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-[12px] text-[var(--color-text-muted)] text-center py-1">
                    아직 공유 링크가 없어요
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { n: 1, title: "링크 만들기", desc: "만료일·학생 필터 설정" },
                        { n: 2, title: "URL 복사", desc: "카톡·문자로 전달" },
                        { n: 3, title: "읽기 전용", desc: "로그인 없이 열람" },
                      ] as const
                    ).map(({ n, title, desc }) => (
                      <div
                        key={n}
                        className="bg-[var(--color-bg-primary)] rounded-lg p-2.5 flex items-start gap-2"
                      >
                        <span className="w-5 h-5 rounded-full bg-[var(--color-overlay-light)] text-[var(--color-text-muted)] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {n}
                        </span>
                        <div>
                          <p className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                            {title}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                            {desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {shareTokens.map((st) => {
                    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${st.token}`;
                    const studentName = st.filter_student_id
                      ? localStudents.find((s) => s.id === st.filter_student_id)?.name ?? "학생"
                      : null;
                    return (
                      <div
                        key={st.id}
                        className="flex justify-between items-center p-3 rounded-lg bg-[var(--color-bg-primary)]"
                      >
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                            {st.label ? (
                              st.label
                            ) : (
                              <span className="italic text-[var(--color-text-muted)]">(제목 없음)</span>
                            )}
                            {studentName && (
                              <span className="ml-2 text-xs text-[var(--color-text-secondary)]">
                                · {studentName}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                            <span className={getExpiryColorClass(st.expires_at)}>
                              {formatExpiry(st.expires_at)}
                            </span>
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="tonal"
                            size="small"
                            feedback="inline"
                            successLabel="복사됨"
                            toastMessage="공유 링크가 복사되었습니다"
                            onClick={() => handleCopyShareLink(shareUrl)}
                          >
                            복사
                          </Button>
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => handleRevokeShareToken(st.id)}
                            className="hover:text-red-400"
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 공유 링크 생성 모달 */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-[var(--color-bg-secondary)] rounded-2xl p-6 w-full max-w-sm mx-4 border border-[var(--color-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-1">공유 링크 만들기</h3>
            <p className="text-[13px] text-[var(--color-text-muted)] mb-5">인증 없이 시간표를 볼 수 있는 링크를 만듭니다</p>

            <div className="mb-4">
              <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-1">제목 (선택)</label>
              <input
                type="text"
                value={shareLabel}
                onChange={(e) => setShareLabel(e.target.value)}
                placeholder="예: 학부모 공유용"
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {localStudents.length > 0 && (
              <div className="mb-4">
                <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-1">학생 필터 (선택)</label>
                <select
                  value={shareStudentId}
                  onChange={(e) => setShareStudentId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">전체 학생</option>
                  {localStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-5">
              <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-1">만료 기간</label>
              <select
                value={shareExpiresInDays}
                onChange={(e) => setShareExpiresInDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value={7}>7일</option>
                <option value={30}>30일</option>
                <option value={90}>90일</option>
                <option value={365}>1년</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg text-sm hover:bg-[var(--color-overlay-light)] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateShareToken}
                disabled={isCreatingShare}
                className="flex-1 py-2 bg-accent text-[var(--color-admin-ink)] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isCreatingShare ? "생성 중..." : "생성"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 초대 모달 */}
      {userId && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            setInviteTargetTeacherId(null);
            setInviteTargetTeacherName(null);
          }}
          userId={userId}
          onInviteCreated={() => {
            fetchData();
            showToast(
              "success",
              `${inviteTargetTeacherName ?? "강사"} 초대 링크가 복사됐습니다 · 24시간 후 만료`
            );
            setInviteTargetTeacherName(null);
            setInviteTargetTeacherId(null);
          }}
          defaultTeacherId={inviteTargetTeacherId ?? undefined}
          defaultTeacherName={inviteTargetTeacherName ?? undefined}
        />
      )}

      {/* 강사 추가 모달 (Smart CTA) */}
      <TeacherAddModal
        open={addTeacherOpen}
        userId={userId ?? ""}
        onClose={() => setAddTeacherOpen(false)}
        onSuccess={async () => {
          setAddTeacherOpen(false);
          await fetchData();
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Helper components — local to settings/page.tsx
// ────────────────────────────────────────────────────────────

interface OwnerRowProps {
  member: Member;
  isMe: boolean;
  canViewEmail: boolean;
}

function OwnerRow({ member, isMe, canViewEmail }: OwnerRowProps) {
  const display = member.name || member.email || member.userId.slice(0, 8);
  const initial = display.charAt(0).toUpperCase();
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-bg-primary)]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold bg-accent/15 text-accent flex-shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-[var(--color-text-primary)] truncate">
              {member.name || display}
            </span>
            <TeacherStatusPill status="owner" />
            {isMe && (
              <span className="text-[11px] text-[var(--color-text-secondary)]">본인</span>
            )}
          </div>
          <p className="text-[12px] text-[var(--color-text-muted)] truncate mt-0.5">
            {canViewEmail ? (member.email ?? "이메일 미입력") : "이메일 비공개"}
          </p>
        </div>
      </div>
      {/* 원장 행은 액션 메뉴 없음 */}
    </div>
  );
}

interface TeacherRowProps {
  teacher: TeacherWithStatus;
  invites: PendingInvite[];
  canManage: boolean;
  currentUserId: string | null;
  onAction: (action: string, teacherId: string) => void;
}

interface MenuItem {
  key: string;
  label: string;
  variant?: "default" | "danger";
  disabled?: boolean;
}

function getMenuItems(status: TeacherWithStatus["status"]): MenuItem[] {
  switch (status) {
    case "invite_pending":
      return [
        { key: "copy_invite", label: "링크 복사" },
        { key: "reinvite", label: "재발송" },
        { key: "cancel_invite", label: "초대 취소", variant: "danger" },
      ];
    case "invite_expired":
      return [
        { key: "reinvite", label: "재초대" },
        { key: "share_link", label: "시간표만 공유", disabled: true },
        { key: "delete", label: "삭제", variant: "danger", disabled: true },
      ];
    case "share_only":
      return [
        { key: "promote_to_invite", label: "초대로 승격", disabled: true },
        { key: "share_link", label: "링크 재발급", disabled: true },
        { key: "cancel_share", label: "공유 취소", variant: "danger", disabled: true },
      ];
    case "active":
      return [
        { key: "change_role", label: "권한 변경" },
        { key: "edit_teacher", label: "강사 정보", disabled: true },
        { key: "kick", label: "팀에서 제외", variant: "danger", disabled: true },
      ];
    case "none":
    default:
      return [
        { key: "invite", label: "초대 보내기" },
        { key: "share_link", label: "시간표 공유 링크 발급", disabled: true },
        { key: "edit_teacher", label: "강사 정보 수정", disabled: true },
        { key: "delete", label: "삭제", variant: "danger", disabled: true },
      ];
  }
}

function getQuickAction(status: TeacherWithStatus["status"]): { action: string; label: string } | null {
  switch (status) {
    case "invite_pending":
      return { action: "copy_invite", label: "링크 복사" };
    case "invite_expired":
      return { action: "reinvite", label: "재초대" };
    case "none":
      return { action: "invite", label: "초대 보내기" };
    case "active":
    case "share_only":
    default:
      return null;
  }
}

function TeacherRow({ teacher, invites, canManage, currentUserId, onAction }: TeacherRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const menuItems = canManage ? getMenuItems(teacher.status) : [];
  const quickAction = canManage ? getQuickAction(teacher.status) : null;
  const initial = teacher.name.charAt(0).toUpperCase();
  const pendingInvite = invites.find((i) => i.teacherId === teacher.id);
  const expiresAt = teacher.status === "invite_pending" ? pendingInvite?.expiresAt ?? teacher.inviteExpiresAt ?? null : null;

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-bg-primary)]">
      <div className="flex items-center gap-3 min-w-0">
        {/*
          teacher.color는 DB에서 오는 동적 hex 값이므로 CSS 변수로 주입.
          docs/code-convention.md § 인라인 스타일 — 동적 색상 예외 적용.
        */}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold flex-shrink-0"
          style={
            {
              "--tc": teacher.color,
              backgroundColor: "color-mix(in srgb, var(--tc) 20%, transparent)",
              color: "var(--tc)",
            } as React.CSSProperties
          }
        >
          {initial}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-[var(--color-text-primary)] truncate">
              {teacher.name}
            </span>
            <TeacherStatusPill status={teacher.status} expiresAt={expiresAt} />
          </div>
          <p className="text-[12px] text-[var(--color-text-muted)] truncate mt-0.5">
            {canManage || teacher.userId === currentUserId
              ? (teacher.email ?? "이메일 미입력")
              : "이메일 비공개"}
          </p>
        </div>
      </div>

      {canManage && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {quickAction && (
            <Button
              variant="tonal"
              size="small"
              feedback={quickAction.action === "copy_invite" ? "inline" : "none"}
              successLabel="복사됨"
              onClick={() => onAction(quickAction.action, teacher.id)}
            >
              {quickAction.label}
            </Button>
          )}
          {menuItems.length > 0 && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)] hover:text-[var(--color-text-secondary)] transition-colors"
                aria-label="더 보기"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal size={16} strokeWidth={1.75} />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-lg overflow-hidden"
                >
                  {menuItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      onClick={
                        item.disabled
                          ? undefined
                          : () => {
                              setMenuOpen(false);
                              onAction(item.key, teacher.id);
                            }
                      }
                      className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                        item.disabled
                          ? "cursor-not-allowed opacity-40 text-[var(--color-text-muted)]"
                          : item.variant === "danger"
                          ? "text-red-400 hover:text-red-300 hover:bg-[var(--color-overlay-light)]"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
