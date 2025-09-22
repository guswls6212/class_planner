/**
 * 🏢 Value Object - StudentId
 *
 * 학생 ID 값 객체입니다. 학생의 고유 식별자를 나타냅니다.
 * 불변성과 타입 안전성을 보장합니다.
 */

export class StudentId {
  private constructor(private readonly _value: string) {
    this.validate();
  }

  // ===== 팩토리 메서드 =====

  /**
   * 새로운 StudentId를 생성합니다.
   */
  static generate(): StudentId {
    // 간단한 UUID v4 생성
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
    return new StudentId(uuid);
  }

  /**
   * 문자열로부터 StudentId를 생성합니다.
   */
  static fromString(value: string): StudentId {
    return new StudentId(value);
  }

  // ===== 검증 =====

  private validate(): void {
    if (!this._value) {
      throw new Error('StudentId cannot be empty');
    }

    if (typeof this._value !== 'string') {
      throw new Error('StudentId must be a string');
    }

    // UUID 형식 검증 (선택적)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(this._value)) {
      throw new Error('StudentId must be a valid UUID');
    }
  }

  // ===== 접근자 =====

  get value(): string {
    return this._value;
  }

  // ===== 동등성 비교 =====

  equals(other: StudentId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  // ===== 직렬화 =====

  toJSON(): string {
    return this._value;
  }
}
