import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { isUUID } from '@/lib/slug'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const { identifier } = await params
  if (!identifier) return NextResponse.json({ error: 'identifier required' }, { status: 400 })

  const client = getServiceRoleClient()

  // UUID → query by id, else query by slug
  const query = isUUID(identifier)
    ? client.from('academies').select('id, name, slug').eq('id', identifier)
    : client.from('academies').select('id, name, slug').eq('slug', identifier)

  const { data, error } = await query.single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ id: data.id, name: data.name, slug: data.slug })
}
