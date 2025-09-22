/**
 * 🏢 Value Object - SubjectId
 */

export class SubjectId {
  private constructor(private readonly _value: string) {
    this.validate();
  }

  static generate(): SubjectId {
    // crypto.randomUUID()가 사용 가능한 경우 사용
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return new SubjectId(crypto.randomUUID());
    }

    // fallback: 간단한 UUID v4 생성
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
    return new SubjectId(uuid);
  }

  static fromString(value: string): SubjectId {
    return new SubjectId(value);
  }

  private validate(): void {
    if (!this._value) {
      throw new Error('SubjectId cannot be empty');
    }

    if (typeof this._value !== 'string') {
      throw new Error('SubjectId must be a string');
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(this._value)) {
      throw new Error('SubjectId must be a valid UUID');
    }
  }

  get value(): string {
    return this._value;
  }

  equals(other: SubjectId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}
