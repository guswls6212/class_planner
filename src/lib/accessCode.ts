import { randomInt } from 'crypto'

const SAFE_DIGITS = '23456789'        // 0, 1 제외
const SAFE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ'   // I, L, O 제외
// prefix 2자 + 랜덤 4자 (SAFE_CHARS에서) = 6자, 31^4 ≈ 923K 조합
const SAFE_CHARS = SAFE_DIGITS + SAFE_LETTERS     // 31자

export function generateAccessCode(studentName: string): string {
  const prefix = studentName.slice(0, 2).padEnd(2, '_')
  const suffix = Array.from({ length: 4 }, () =>
    SAFE_CHARS[randomInt(0, SAFE_CHARS.length)]
  ).join('')
  return `${prefix}${suffix}`
}
