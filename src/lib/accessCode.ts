const SAFE_DIGITS = '23456789'        // 0, 1 제외
const SAFE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'  // I, O 제외

export function generateAccessCode(studentName: string): string {
  const prefix = studentName.slice(0, 2).padEnd(2, '_')
  const digit = SAFE_DIGITS[Math.floor(Math.random() * SAFE_DIGITS.length)]
  const letter = SAFE_LETTERS[Math.floor(Math.random() * SAFE_LETTERS.length)]
  return `${prefix}${digit}${letter}`
}
