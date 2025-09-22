/**
 * 🏢 Value Object - Color
 *
 * 색상 값 객체입니다. 유효한 색상 값만 허용합니다.
 */

export class Color {
  private constructor(private readonly _value: string) {
    this.validate();
  }

  // ===== 팩토리 메서드 =====

  /**
   * 문자열로부터 Color를 생성합니다.
   */
  static fromString(value: string): Color {
    return new Color(value);
  }

  /**
   * 미리 정의된 색상 팔레트에서 Color를 생성합니다.
   */
  static fromPalette(colorName: string): Color {
    const palette: Record<string, string> = {
      red: '#ef4444',
      blue: '#3b82f6',
      green: '#10b981',
      yellow: '#f59e0b',
      purple: '#8b5cf6',
      pink: '#ec4899',
      indigo: '#6366f1',
      teal: '#14b8a6',
      orange: '#f97316',
      gray: '#6b7280',
    };

    const colorValue = palette[colorName.toLowerCase()];
    if (!colorValue) {
      throw new Error(`Unknown color: ${colorName}`);
    }

    return new Color(colorValue);
  }

  // ===== 검증 =====

  private validate(): void {
    if (!this._value) {
      throw new Error('Color cannot be empty');
    }

    if (typeof this._value !== 'string') {
      throw new Error('Color must be a string');
    }

    // HEX 색상 형식 검증
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(this._value)) {
      throw new Error('Color must be a valid HEX color (e.g., #ff0000)');
    }
  }

  // ===== 접근자 =====

  get value(): string {
    return this._value;
  }

  // ===== 동등성 비교 =====

  equals(other: Color): boolean {
    return this._value.toLowerCase() === other._value.toLowerCase();
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }

  // ===== 유틸리티 메서드 =====

  /**
   * 색상의 밝기를 계산합니다.
   */
  getBrightness(): number {
    const hex = this._value.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  /**
   * 색상이 어두운지 확인합니다.
   */
  isDark(): boolean {
    return this.getBrightness() < 128;
  }

  /**
   * 색상이 밝은지 확인합니다.
   */
  isLight(): boolean {
    return this.getBrightness() >= 128;
  }
}
