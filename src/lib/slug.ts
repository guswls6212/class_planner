export function sanitizeSlug(input: string): string {
  // NFC 정규화 — macOS 클립보드/URL 디코딩이 한글을 NFD로 보내는 경우가 있어
  // DB(NFC 저장)와 매칭 실패를 방지. 저장과 조회 양쪽 입력에 통일 적용.
  return input
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Slug lookup 전용 NFC 정규화. sanitizeSlug보다 가벼움 — 특수문자 제거 없이
 * NFC + trim만 적용. URL path identifier가 NFD로 도착해도 DB의 NFC slug와
 * 매칭되도록 lookup 직전에 호출.
 */
export function normalizeSlugForLookup(slug: string): string {
  return slug.normalize('NFC').trim()
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
