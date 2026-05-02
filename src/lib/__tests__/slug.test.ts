import { describe, it, expect } from 'vitest'
import { generateSlug, isValidSlug, sanitizeSlug, isUUID } from '../slug'

describe('generateSlug', () => {
  it('학원명을 그대로 slug로 반환', () => {
    expect(generateSlug('현진학원')).toBe('현진학원')
  })

  it('앞뒤 공백 제거, 중간 공백은 하이픈', () => {
    expect(generateSlug('  현진 학원  ')).toBe('현진-학원')
    expect(generateSlug('My Academy')).toBe('My-Academy')
  })

  it('50자 초과 시 잘라냄', () => {
    const long = '가'.repeat(60)
    expect(generateSlug(long).length).toBeLessThanOrEqual(50)
  })
})

describe('isValidSlug', () => {
  it('2자 이상 50자 이하이고 sanitized와 같으면 유효', () => {
    expect(isValidSlug('현진학원')).toBe(true)
    expect(isValidSlug('ab')).toBe(true)
  })

  it('1자 이하는 유효하지 않음', () => {
    expect(isValidSlug('a')).toBe(false)
    expect(isValidSlug('')).toBe(false)
  })

  it('51자 이상은 유효하지 않음', () => {
    expect(isValidSlug('a'.repeat(51))).toBe(false)
  })
})

describe('sanitizeSlug', () => {
  it('공백→하이픈, 중복 하이픈 제거, 앞뒤 하이픈 제거', () => {
    expect(sanitizeSlug('hello world')).toBe('hello-world')
    expect(sanitizeSlug('my--academy')).toBe('my-academy')
    expect(sanitizeSlug('-test-')).toBe('test')
  })

  it('특수문자 제거', () => {
    expect(sanitizeSlug('hello!')).toBe('hello')
  })
})

describe('isUUID', () => {
  it('UUID 형식 감지', () => {
    expect(isUUID('829d7cc2-7fe9-4618-8b3b-7df2d473e8ea')).toBe(true)
    expect(isUUID('현진학원')).toBe(false)
    expect(isUUID('hyunjin-academy')).toBe(false)
  })
})
