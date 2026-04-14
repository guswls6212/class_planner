"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { logger } from "../../lib/logger";

const ROLE_LABEL: Record<string, string> = {
  owner: "원장",
  admin: "관리자",
  member: "강사",
};

interface Member {
  userId: string;
  role: string;
  email: string | null;
  name: string | null;
  joinedAt: string;
}

interface PendingInvite {
  id: string;
  token: string;
  role: string;
  expiresAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [myRole, setMyRole] = useState<string>("member");
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

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
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/members?userId=${userId}`),
        fetch(`/api/invites?userId=${userId}`),
      ]);

      if (membersRes.ok) {
        const { data } = await membersRes.json();
        setMembers(data ?? []);
        const me = (data ?? []).find((m: Member) => m.userId === userId);
        if (me) setMyRole(me.role);
      }

      if (invitesRes.ok) {
        const { data } = await invitesRes.json();
        setInvites(data ?? []);
      }
    } catch (err) {
      logger.error("설정 데이터 로드 실패", undefined, err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchData();
  }, [userId, fetchData]);

  const handleCreateInvite = async () => {
    if (!userId) return;
    setIsCreatingInvite(true);
    try {
      const res = await fetch(`/api/invites?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const link = `${window.location.origin}/invite/${data.data.token}`;
        setGeneratedLink(link);
        await fetchData();
      }
    } catch (err) {
      logger.error("초대 링크 생성 실패", undefined, err as Error);
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    if (!userId) return;
    await fetch(`/api/invites/${id}?userId=${userId}`, { method: "DELETE" });
    await fetchData();
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!userId || !confirm("이 멤버를 제거하시겠습니까?")) return;
    await fetch(`/api/members/${targetUserId}?userId=${userId}`, { method: "DELETE" });
    await fetchData();
  };

  const handleCopyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setShowInviteModal(false);
    setGeneratedLink(null);
    setInviteRole("member");
    setCopied(false);
  };

  const canManage = myRole === "owner" || myRole === "admin";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">학원 설정</h1>

      {/* 멤버 섹션 */}
      <section className="bg-[var(--color-bg-secondary)] rounded-xl p-5 mb-4 border border-[var(--color-border)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            멤버 ({members.length}명)
          </h2>
          {canManage && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              + 초대하기
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex justify-between items-center p-3 rounded-lg bg-[var(--color-bg-primary)]"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-[var(--color-text-primary)]">
                  {member.name || member.email || member.userId.slice(0, 8)}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    member.role === "owner"
                      ? "bg-purple-100 text-purple-700"
                      : member.role === "admin"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ROLE_LABEL[member.role] ?? member.role}
                </span>
                {member.userId === userId && (
                  <span className="text-xs text-[var(--color-text-secondary)]">본인</span>
                )}
              </div>
              {myRole === "owner" && member.userId !== userId && (
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  className="text-xs px-3 py-1 border border-red-300 text-red-500 rounded-md hover:bg-red-50 transition-colors"
                >
                  제거
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 대기 중인 초대 섹션 */}
      {canManage && invites.length > 0 && (
        <section className="bg-[var(--color-bg-secondary)] rounded-xl p-5 border border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
            대기 중인 초대 ({invites.length}개)
          </h2>
          <div className="flex flex-col gap-2">
            {invites.map((invite) => {
              const link = `${window.location.origin}/invite/${invite.token}`;
              return (
                <div
                  key={invite.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-amber-50 border border-amber-200"
                >
                  <div>
                    <span className="text-sm text-amber-800">
                      {ROLE_LABEL[invite.role] ?? invite.role} 역할 초대
                    </span>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      만료: {new Date(invite.expiresAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyLink(link)}
                      className="text-xs px-3 py-1 border border-gray-300 text-[var(--color-text-secondary)] rounded-md hover:bg-[var(--color-bg-primary)] transition-colors"
                    >
                      복사
                    </button>
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="text-xs px-3 py-1 border border-red-300 text-red-500 rounded-md hover:bg-red-50 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 초대 모달 */}
      {showInviteModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl p-7 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-1">멤버 초대</h3>
            <p className="text-sm text-gray-500 mb-5">초대 링크를 생성하여 공유하세요</p>

            {!generatedLink ? (
              <>
                <fieldset className="mb-5">
                  <legend className="text-sm font-medium text-gray-700 mb-2">역할 선택</legend>
                  <div className="flex gap-3">
                    {(["member", "admin"] as const).map((r) => (
                      <label
                        key={r}
                        className={`flex-1 p-3 border-2 rounded-lg cursor-pointer text-center transition-colors ${
                          inviteRole === r
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="inviteRole"
                          value={r}
                          checked={inviteRole === r}
                          onChange={() => setInviteRole(r)}
                          className="sr-only"
                        />
                        <div className="font-medium text-sm text-gray-800">{ROLE_LABEL[r]}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {r === "member" ? "시간표 조회" : "학생·수업 관리 + 초대"}
                        </div>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCreateInvite}
                    disabled={isCreatingInvite}
                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isCreatingInvite ? "생성 중..." : "링크 생성"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-700 block mb-2">초대 링크</label>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-xs text-gray-500 truncate border border-gray-200">
                    {generatedLink}
                  </div>
                  <button
                    onClick={() => handleCopyLink(generatedLink)}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 whitespace-nowrap"
                  >
                    {copied ? "복사됨!" : "복사"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-5">7일 후 만료 · 1회만 사용 가능</p>
                <button
                  onClick={closeModal}
                  className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  닫기
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
