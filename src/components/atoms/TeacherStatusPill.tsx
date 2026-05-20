'use client'

import { Crown, Shield, GraduationCap } from 'lucide-react'
import type { TeacherStatus } from '@/app/api/teachers/route'
import type { RoleKey } from '@/lib/rolePermissions'

type TeacherPillStatus = TeacherStatus | 'owner'

interface TeacherStatusPillProps {
  status: TeacherPillStatus
  expiresAt?: string | null
  /**
   * 멤버의 권한 역할 (academy_members.role). undefined 시:
   *  - status='owner' → owner 아이콘 (Crown)
   *  - 그 외 → member 아이콘 (GraduationCap) — 현재 teachers 목록 default
   * 미래 admin 멤버 표시 시 role='admin' 전달 → Shield 아이콘.
   */
  role?: RoleKey
}

const STATUS_CONFIG: Record<TeacherPillStatus, { label: (expiresAt?: string | null) => string; className: string }> = {
  owner: {
    label: () => '원장',
    className: 'bg-amber-500/20 text-amber-400',
  },
  active: {
    label: () => '가입됨',
    className: 'bg-emerald-500/20 text-emerald-400',
  },
  invite_pending: {
    label: (expiresAt) => {
      if (!expiresAt) return '초대 대기'
      const diffMs = new Date(expiresAt).getTime() - Date.now()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      return diffDays > 0 ? `초대 대기 · D-${diffDays}` : '초대 대기'
    },
    className: 'bg-yellow-500/20 text-yellow-400',
  },
  invite_expired: {
    label: () => '초대 만료',
    className: 'bg-red-500/20 text-red-400',
  },
  share_only: {
    label: () => '시간표 공유 중',
    className: 'bg-blue-500/20 text-blue-400',
  },
  none: {
    label: () => '미초대',
    className: 'bg-slate-500/20 text-slate-400',
  },
}

const ROLE_ICON_MAP = {
  owner: Crown,
  admin: Shield,
  member: GraduationCap,
} as const

/**
 * Pending 또는 미확정 status 에서 아이콘 dimming 적용 (Variant X).
 * role 정보는 보존 (어떤 역할로 초대했는지) — opacity 만 낮춤.
 */
const PENDING_STATUSES = new Set<TeacherPillStatus>([
  'invite_pending',
  'invite_expired',
  'none',
])

export function TeacherStatusPill({ status, expiresAt, role }: TeacherStatusPillProps) {
  const config = STATUS_CONFIG[status]

  // 아이콘 선택: status='owner' 우선, 그 외 role prop 또는 member fallback.
  const iconRole: RoleKey = status === 'owner' ? 'owner' : (role ?? 'member')
  const Icon = ROLE_ICON_MAP[iconRole]
  const isDimmed = PENDING_STATUSES.has(status)

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${config.className}`}
    >
      <Icon
        className={`w-3 h-3 ${isDimmed ? 'opacity-50' : ''}`}
        strokeWidth={2}
        aria-hidden="true"
        data-testid={`pill-icon-${iconRole}${isDimmed ? '-dimmed' : ''}`}
      />
      {config.label(expiresAt)}
    </span>
  )
}
