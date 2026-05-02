import { describe, it, expect } from 'vitest'
import { generateAccessCode } from '../accessCode'

describe('generateAccessCode', () => {
  it('2자 이름 앞 + 숫자 + 알파벳 = 4자 반환', () => {
    const code = generateAccessCode('이현진')
    expect(code).toHaveLength(4)
    expect(code.startsWith('이현')).toBe(true)
  })

  it('1자 이름은 _ 패딩 처리', () => {
    const code = generateAccessCode('이')
    expect(code.startsWith('이_')).toBe(true)
    expect(code).toHaveLength(4)
  })

  it('혼동 문자(0, 1, O, I, l) 포함 안 함', () => {
    for (let i = 0; i < 1000; i++) {
      const code = generateAccessCode('테스트')
      const digit = code[2]
      const letter = code[3]
      expect(['0', '1']).not.toContain(digit)
      expect(['O', 'I', 'l']).not.toContain(letter)
    }
  })

  it('빈 문자열은 __ 접두사', () => {
    const code = generateAccessCode('')
    expect(code.startsWith('__')).toBe(true)
    expect(code).toHaveLength(4)
  })
})
