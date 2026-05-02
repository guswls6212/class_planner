export function sanitizeSlug(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

export function generateSlug(name: string): string {
  return sanitizeSlug(name).slice(0, 50)
}

export function isValidSlug(slug: string): boolean {
  if (!slug) return false
  const s = sanitizeSlug(slug)
  return s.length >= 2 && s.length <= 50
}

export function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}
