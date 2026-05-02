import { randomInt } from 'crypto'

const SAFE_DIGITS = '23456789'        // 0, 1 제외
const SAFE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ'   // I, L, O 제외

export function generateAccessCode(studentName: string): string {
  const prefix = studentName.slice(0, 2).padEnd(2, '_')
  const digit = SAFE_DIGITS[randomInt(0, SAFE_DIGITS.length)]
  const letter = SAFE_LETTERS[randomInt(0, SAFE_LETTERS.length)]
  return `${prefix}${digit}${letter}`
}
