/**
 * Domain Entity - Teacher
 *
 * 강사 도메인 엔티티. 학원에 소속된 강사와 관련된 비즈니스 로직을 포함합니다.
 * 불변성과 캡슐화를 통해 데이터 무결성을 보장합니다.
 */

import { Color } from '../value-objects/Color';
import { TeacherId } from '../value-objects/TeacherId';

export class Teacher {
  private readonly _id: TeacherId;
  private readonly _name: string;
  private readonly _color: Color;
  private readonly _userId: string | null;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(
    id: TeacherId,
    name: string,
    color: Color,
    userId: string | null,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    this._id = id;
    this._name = name;
    this._color = color;
    this._userId = userId;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this.validate();
  }

  // ===== 팩토리 메서드 =====

  static create(name: string, color: string, userId?: string): Teacher {
    const trimmedName = name.trim();
    const teacherId = TeacherId.generate();
    const colorValue = Color.fromString(color);
    return new Teacher(teacherId, trimmedName, colorValue, userId ?? null);
  }

  static restore(
    id: string,
    name: string,
    color: string,
    userId?: string | null,
    createdAt?: Date,
    updatedAt?: Date
  ): Teacher {
    const teacherId = TeacherId.fromString(id);
    const colorValue = Color.fromString(color);
    const created = createdAt || new Date();
    const updated = updatedAt || new Date();
    return new Teacher(teacherId, name, colorValue, userId ?? null, created, updated);
  }

  // ===== 비즈니스 로직 =====

  changeName(newName: string): Teacher {
    const trimmedName = newName.trim();
    if (trimmedName === this._name) return this;
    return new Teacher(this._id, trimmedName, this._color, this._userId, this._createdAt, new Date());
  }

  changeColor(newColor: string): Teacher {
    const colorValue = Color.fromString(newColor);
    if (colorValue.equals(this._color)) return this;
    return new Teacher(this._id, this._name, colorValue, this._userId, this._createdAt, new Date());
  }

  linkUser(userId: string): Teacher {
    return new Teacher(this._id, this._name, this._color, userId, this._createdAt, new Date());
  }

  unlinkUser(): Teacher {
    return new Teacher(this._id, this._name, this._color, null, this._createdAt, new Date());
  }

  static validateName(name: string): ValidationResult {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return {
        isValid: false,
        errors: [{ field: 'name', message: '강사 이름을 입력해주세요.', code: 'NAME_REQUIRED' }],
      };
    }

    if (trimmedName.length < 2) {
      return {
        isValid: false,
        errors: [{ field: 'name', message: '강사 이름은 2글자 이상이어야 합니다.', code: 'NAME_TOO_SHORT' }],
      };
    }

    if (trimmedName.length > 20) {
      return {
        isValid: false,
        errors: [{ field: 'name', message: '강사 이름은 20글자 이하여야 합니다.', code: 'NAME_TOO_LONG' }],
      };
    }

    return { isValid: true, errors: [] };
  }

  static isNameDuplicate(name: string, existingTeachers: Teacher[]): boolean {
    const trimmedName = name.trim().toLowerCase();
    return existingTeachers.some(t => t.name.toLowerCase() === trimmedName);
  }

  private validate(): void {
    const validation = Teacher.validateName(this._name);
    if (!validation.isValid) {
      throw new Error(`Invalid teacher: ${validation.errors.map(e => e.message).join(', ')}`);
    }
  }

  // ===== 접근자 =====

  get id(): TeacherId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get color(): Color {
    return this._color;
  }

  get userId(): string | null {
    return this._userId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ===== 직렬화 =====

  toDto(): TeacherDto {
    return {
      id: this._id.value,
      name: this._name,
      color: this._color.value,
      userId: this._userId,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  toJSON(): TeacherJson {
    return {
      id: this._id.value,
      name: this._name,
      color: this._color.value,
      userId: this._userId,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  static fromJSON(json: TeacherJson): Teacher {
    return Teacher.restore(
      json.id,
      json.name,
      json.color,
      json.userId,
      new Date(json.createdAt),
      new Date(json.updatedAt)
    );
  }

  equals(other: Teacher): boolean {
    return this._id.equals(other._id);
  }

  toString(): string {
    return `Teacher(id=${this._id.value}, name=${this._name})`;
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

export interface TeacherDto {
  id: string;
  name: string;
  color: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherJson {
  id: string;
  name: string;
  color: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}
