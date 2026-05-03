import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { resolveAcademyMembership } from '@/lib/resolveAcademyMembership'
import { generateAccessCode } from '@/lib/accessCode'
import { logger } from '@/lib/logger'

const EXPIRES_DAYS = 180 // 6개월

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const { mode = 'create', studentIds } = body as {
    mode?: 'create' | 'renew'
    studentIds?: string[]
  }

  if (!['create', 'renew'].includes(mode)) {
    return NextResponse.json({ error: "mode는 'create' 또는 'renew'만 가능합니다." }, { status: 400 })
  }

  // Optional per-student filter — when present, operate only on those students.
  // Used by per-row "재발급" / "코드 생성" actions in StudentDetailPanel.
  const filterIds: string[] | null =
    Array.isArray(studentIds) && studentIds.length > 0
      ? studentIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : null

  let membership: { academyId: string; role: string }
  try {
    membership = await resolveAcademyMembership(userId)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: '원장과 관리자만 접속 코드를 관리할 수 있습니다.' }, { status: 403 })
  }

  const client = getServiceRoleClient()
  const { academyId } = membership

  // 1. 학원의 학생 조회 (filterIds 있으면 해당 학생만)
  let studentQuery = client
    .from('students')
    .select('id, name')
    .eq('academy_id', academyId)

  if (filterIds) {
    studentQuery = studentQuery.in('id', filterIds)
  }

  const { data: students, error: studentsError } = await studentQuery

  if (studentsError || !students) {
    logger.error('학생 목록 조회 실패', { academyId }, studentsError as Error)
    return NextResponse.json({ error: '학생 목록 조회 실패' }, { status: 500 })
  }

  const expiresAt = new Date(Date.now() + EXPIRES_DAYS * 24 * 60 * 60 * 1000).toISOString()

  if (mode === 'renew') {
    // 기존 코드 revoke (filterIds 있으면 해당 학생만)
    let revokeQuery = client
      .from('share_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('academy_id', academyId)
      .not('access_code', 'is', null)

    if (filterIds) {
      revokeQuery = revokeQuery.in('filter_student_id', filterIds)
    }

    const { error: revokeError } = await revokeQuery

    if (revokeError) {
      logger.error('기존 코드 revoke 실패', { academyId }, revokeError as Error)
      return NextResponse.json({ error: 'revoke 실패' }, { status: 500 })
    }
  }

  // 2. 코드 없는 학생에게만 생성 (create) 또는 전체 생성 (renew)
  let studentsToCreate = students

  if (mode === 'create') {
    const { data: existingCodes } = await client
      .from('share_tokens')
      .select('filter_student_id')
      .eq('academy_id', academyId)
      .not('access_code', 'is', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())

    const existingStudentIds = new Set((existingCodes ?? []).map((c) => c.filter_student_id))
    studentsToCreate = students.filter((s) => !existingStudentIds.has(s.id))
  }

  if (studentsToCreate.length === 0) {
    return NextResponse.json({ success: true, created: 0 })
  }

  // 3. 각 학생 코드 생성

  // 3-1. batch 내 중복 없이 후보 코드 생성
  const usedCodes = new Set<string>()
  const candidates: string[] = []

  for (const student of studentsToCreate) {
    let code = generateAccessCode(student.name)
    let attempts = 0
    while (usedCodes.has(code) && attempts < 50) {
      code = generateAccessCode(student.name)
      attempts++
    }
    usedCodes.add(code)
    candidates.push(code)
  }

  // 3-2. DB에서 academy 내 활성 코드와 충돌 확인
  const { data: existingDbCodes } = await client
    .from('share_tokens')
    .select('access_code')
    .eq('academy_id', academyId)
    .in('access_code', candidates)
    .is('revoked_at', null)

  const existingDbSet = new Set(
    (existingDbCodes ?? []).map((r: { access_code: string }) => r.access_code)
  )

  // 3-3. DB 충돌 코드 재생성
  for (let i = 0; i < candidates.length; i++) {
    if (existingDbSet.has(candidates[i])) {
      let code = generateAccessCode(studentsToCreate[i].name)
      let attempts = 0
      while ((existingDbSet.has(code) || usedCodes.has(code)) && attempts < 50) {
        code = generateAccessCode(studentsToCreate[i].name)
        attempts++
      }
      candidates[i] = code
    }
  }

  // 3-4. insert 준비
  const inserts = []
  for (let i = 0; i < studentsToCreate.length; i++) {
    const student = studentsToCreate[i]
    inserts.push({
      academy_id: academyId,
      label: `${student.name} 학부모 접속 코드`,
      filter_student_id: student.id,
      access_code: candidates[i],
      expires_at: expiresAt,
      created_by: userId,
    })
  }

  const { error: insertError } = await client.from('share_tokens').insert(inserts)

  if (insertError) {
    logger.error('접속 코드 생성 실패', { academyId }, insertError as Error)
    return NextResponse.json({ error: '코드 생성 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true, created: inserts.length })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { studentId } = await request.json().catch(() => ({}))
  if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

  let membership: { academyId: string; role: string }
  try {
    membership = await resolveAcademyMembership(userId)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const client = getServiceRoleClient()
  await client
    .from('share_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('academy_id', membership.academyId)
    .eq('filter_student_id', studentId)
    .not('access_code', 'is', null)

  return NextResponse.json({ success: true })
}
