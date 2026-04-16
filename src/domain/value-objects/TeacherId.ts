/**
 * Value Object - TeacherId
 *
 * 강사 ID 값 객체. 강사의 고유 식별자를 나타냅니다.
 * 불변성과 타입 안전성을 보장합니다.
 */

export class TeacherId {
  private constructor(private readonly _value: string) {
    this.validate();
  }

  static generate(): TeacherId {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
    return new TeacherId(uuid);
  }

  static fromString(value: string): TeacherId {
    return new TeacherId(value);
  }

  private validate(): void {
    if (!this._value) {
      throw new Error('TeacherId cannot be empty');
    }
    if (typeof this._value !== 'string') {
      throw new Error('TeacherId must be a string');
    }
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(this._value)) {
      throw new Error('TeacherId must be a valid UUID');
    }
  }

  get value(): string {
    return this._value;
  }

  equals(other: TeacherId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}
