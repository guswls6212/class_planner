'use client'

import type { TeacherStatus } from '@/app/api/teachers/route'
import {
  ROLE_DESCRIPTORS,
  ROLE_ICONS,
  type RoleKey,
} from '@/lib/rolePermissions'

type TeacherPillStatus = TeacherStatus | 'owner'

interface TeacherStatusPillProps {
  status: TeacherPillStatus
  expiresAt?: string | null
  /**
   * 멤버의 권한 역할 (academy_members.role). undefined 시:
   *  - status='owner' → owner (Crown, amber)
   *  - 그 외 → member (GraduationCap, emerald) — 현재 teachers 목록 default
   * admin 멤버 표시 시 role='admin' 전달 → Shield, blue 색.
   *
   * 색 SSOT: ROLE_DESCRIPTORS[role].colors 만 사용. status 와 무관하게 role 색
   * 유지 — 강사가 "초대 대기" 일 때도 emerald chip (이전엔 yellow).
   * status 는 라벨 텍스트 + dimming(opacity-50) 으로만 표현.
   */
  role?: RoleKey
}

const STATUS_LABEL: Record<TeacherPillStatus, (expiresAt?: string | null) => string> = {
  owner: () => '원장',
  active: () => '가입됨',
  invite_pending: (expiresAt) => {
    if (!expiresAt) return '초대 대기'
    const diffMs = new Date(expiresAt).getTime() - Date.now()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? `초대 대기 · D-${diffDays}` : '초대 대기'
  },
  invite_expired: () => '초대 만료',
  share_only: () => '시간표 공유 중',
  none: () => '미초대',
}

/**
 * Pending / 미확정 status 에서 chip opacity-50 (Variant X).
 * role 정보는 보존 (어떤 역할로 초대했는지) — 색·아이콘 그대로, opacity 만 낮춤.
 */
const PENDING_STATUSES = new Set<TeacherPillStatus>([
  'invite_pending',
  'invite_expired',
  'none',
])

export function TeacherStatusPill({ status, expiresAt, role }: TeacherStatusPillProps) {
  // 아이콘·색 선택: status='owner' 우선, 그 외 role prop 또는 member fallback.
  const resolvedRole: RoleKey = status === 'owner' ? 'owner' : (role ?? 'member')
  const colors = ROLE_DESCRIPTORS[resolvedRole].colors
  const Icon = ROLE_ICONS[resolvedRole]
  const isDimmed = PENDING_STATUSES.has(status)
  const label = STATUS_LABEL[status](expiresAt)

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${colors.bg} ${colors.text} ${isDimmed ? 'opacity-50' : ''}`}
      data-testid={`pill-${resolvedRole}${isDimmed ? '-dimmed' : ''}`}
    >
      <Icon
        className="w-3 h-3"
        strokeWidth={2}
        aria-hidden="true"
        data-testid={`pill-icon-${resolvedRole}${isDimmed ? '-dimmed' : ''}`}
      />
      {label}
    </span>
  )
}
