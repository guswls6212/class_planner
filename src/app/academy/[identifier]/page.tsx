'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isUUID } from '@/lib/slug'

export default function AcademyAccessPage({
  params,
}: {
  params: Promise<{ identifier: string }>
}) {
  const { identifier } = use(params)
  const router = useRouter()
  const [academyName, setAcademyName] = useState<string>('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/academy/${identifier}/public`)
      .then((r) => r.json())
      .then((d) => {
        setAcademyName(d.name ?? '학원')
        // UUID로 접속했고 slug가 있으면 slug URL로 redirect
        if (d.slug && isUUID(identifier)) {
          router.replace(`/academy/${d.slug}`)
        }
      })
      .catch(() => setAcademyName('학원'))
  }, [identifier, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/share/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, academyId: identifier }),
      })

      if (!res.ok) {
        setError('코드가 올바르지 않습니다. 다시 확인해주세요.')
        setLoading(false)
        return
      }

      const { token } = await res.json()
      router.push(`/share/${token}`)
    } catch {
      setError('일시적인 오류가 발생했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-2xl font-bold text-slate-100">
            {academyName || '...'}
          </div>
          <p className="text-sm text-slate-400">
            자녀의 접속 코드를 입력해 시간표를 확인하세요
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="접속 코드 입력 (예: 이현2A)"
            maxLength={4}
            className="mb-3 w-full rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-4 text-center text-2xl font-bold tracking-widest text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none"
            autoComplete="off"
          />

          {error && (
            <p className="mb-3 text-center text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.trim().length < 4}
            className="w-full rounded-xl bg-amber-500 py-3 text-base font-bold text-gray-900 hover:bg-amber-400 disabled:opacity-40 transition-colors"
          >
            {loading ? '확인 중...' : '시간표 보기 →'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          접속 코드는 학원에서 받은 서류 또는 원장에게 문의하세요
        </p>
      </div>
    </div>
  )
}
