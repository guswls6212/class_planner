import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ academyId: string }> }
) {
  const { academyId } = await params
  if (!academyId) return NextResponse.json({ error: 'academyId required' }, { status: 400 })

  const client = getServiceRoleClient()
  const { data, error } = await client
    .from('academies')
    .select('name')
    .eq('id', academyId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ name: data.name })
}
