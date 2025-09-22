/**
 * 🏢 Domain Entity - Subject
 *
 * 과목 도메인 엔티티입니다. 과목과 관련된 모든 비즈니스 로직을 포함합니다.
 */

import { Color } from '../value-objects/Color';
import { SubjectId } from '../value-objects/SubjectId';

export class Subject {
  private readonly _id: SubjectId;
  private readonly _name: string;
  private readonly _color: Color;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(
    id: SubjectId,
    name: string,
    color: Color,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    this._id = id;
    this._name = name;
    this._color = color;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this.validate();
  }

  // ===== 팩토리 메서드 =====

  /**
   * 새로운 과목을 생성합니다.
   */
  static create(name: string, color: string): Subject {
    const trimmedName = name.trim();
    const subjectId = SubjectId.generate();
    const colorValue = Color.fromString(color);

    return new Subject(subjectId, trimmedName, colorValue);
  }

  /**
   * 기존 데이터로부터 과목을 복원합니다.
   */
  static restore(
    id: string,
    name: string,
    color: string,
    createdAt?: Date,
    updatedAt?: Date
  ): Subject {
    const subjectId = SubjectId.fromString(id);
    const colorValue = Color.fromString(color);
    const created = createdAt || new Date();
    const updated = updatedAt || new Date();

    return new Subject(subjectId, name, colorValue, created, updated);
  }

  // ===== 비즈니스 로직 =====

  /**
   * 과목 이름을 변경합니다.
   */
  changeName(newName: string): Subject {
    const trimmedName = newName.trim();

    if (trimmedName === this._name) {
      return this;
    }

    return new Subject(
      this._id,
      trimmedName,
      this._color,
      this._createdAt,
      new Date()
    );
  }

  /**
   * 과목 색상을 변경합니다.
   */
  changeColor(newColor: string): Subject {
    const colorValue = Color.fromString(newColor);

    if (colorValue.equals(this._color)) {
      return this;
    }

    return new Subject(
      this._id,
      this._name,
      colorValue,
      this._createdAt,
      new Date()
    );
  }

  /**
   * 과목 이름이 유효한지 검증합니다.
   */
  static validateName(name: string): ValidationResult {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return {
        isValid: false,
        errors: [
          {
            field: 'name',
            message: '과목 이름을 입력해주세요.',
            code: 'NAME_REQUIRED',
          },
        ],
      };
    }

    if (trimmedName.length < 2) {
      return {
        isValid: false,
        errors: [
          {
            field: 'name',
            message: '과목 이름은 2글자 이상이어야 합니다.',
            code: 'NAME_TOO_SHORT',
          },
        ],
      };
    }

    if (trimmedName.length > 30) {
      return {
        isValid: false,
        errors: [
          {
            field: 'name',
            message: '과목 이름은 30글자 이하여야 합니다.',
            code: 'NAME_TOO_LONG',
          },
        ],
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * 과목 이름이 중복되는지 확인합니다.
   */
  static isNameDuplicate(name: string, existingSubjects: Subject[]): boolean {
    const trimmedName = name.trim().toLowerCase();
    return existingSubjects.some(
      subject => subject.name.toLowerCase() === trimmedName
    );
  }

  // ===== 내부 검증 =====

  private validate(): void {
    const validation = Subject.validateName(this._name);
    if (!validation.isValid) {
      throw new Error(
        `Invalid subject: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }
  }

  // ===== 접근자 =====

  get id(): SubjectId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get color(): Color {
    return this._color;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ===== 직렬화 =====

  toDto(): SubjectDto {
    return {
      id: this._id.value,
      name: this._name,
      color: this._color.value,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  toJSON(): SubjectJson {
    return {
      id: this._id.value,
      name: this._name,
      color: this._color.value,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  static fromJSON(json: SubjectJson): Subject {
    return Subject.restore(
      json.id,
      json.name,
      json.color,
      new Date(json.createdAt),
      new Date(json.updatedAt)
    );
  }

  // ===== 동등성 비교 =====

  equals(other: Subject): boolean {
    return this._id.equals(other._id);
  }

  toString(): string {
    return `Subject(id=${this._id.value}, name=${this._name})`;
  }
}

// ===== 타입 정의 =====

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface SubjectDto {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectJson {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}
