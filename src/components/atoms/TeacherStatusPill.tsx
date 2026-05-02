'use client'

import type { TeacherStatus } from '@/app/api/teachers/route'

type TeacherPillStatus = TeacherStatus | 'owner'

interface TeacherStatusPillProps {
  status: TeacherPillStatus
  expiresAt?: string | null
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

export function TeacherStatusPill({ status, expiresAt }: TeacherStatusPillProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${config.className}`}
    >
      <span className="text-[8px]">●</span>
      {config.label(expiresAt)}
    </span>
  )
}
