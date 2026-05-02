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

  const { mode = 'create' } = await request.json().catch(() => ({ mode: 'create' }))

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

  // 1. 학원의 모든 학생 조회
  const { data: students, error: studentsError } = await client
    .from('students')
    .select('id, name')
    .eq('academy_id', academyId)

  if (studentsError || !students) {
    logger.error('학생 목록 조회 실패', { academyId }, studentsError as Error)
    return NextResponse.json({ error: '학생 목록 조회 실패' }, { status: 500 })
  }

  const expiresAt = new Date(Date.now() + EXPIRES_DAYS * 24 * 60 * 60 * 1000).toISOString()

  if (mode === 'renew') {
    // 기존 코드 전체 revoke
    await client
      .from('share_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('academy_id', academyId)
      .not('access_code', 'is', null)
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

  // 3. 각 학생 코드 생성 (충돌 방지: 생성 목록 내 중복 체크)
  const inserts = []
  const usedCodes = new Set<string>()

  for (const student of studentsToCreate) {
    let code = generateAccessCode(student.name)
    let attempts = 0
    while (usedCodes.has(code) && attempts < 10) {
      code = generateAccessCode(student.name)
      attempts++
    }
    usedCodes.add(code)
    inserts.push({
      academy_id: academyId,
      label: `${student.name} 학부모 접속 코드`,
      filter_student_id: student.id,
      access_code: code,
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
