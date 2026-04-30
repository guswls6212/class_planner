/**
 * Domain Entity - Teacher
 *
 * 강사 도메인 엔티티. 학원에 소속된 강사와 관련된 비즈니스 로직을 포함합니다.
 * 불변성과 캡슐화를 통해 데이터 무결성을 보장합니다.
 */

import { Color } from '../value-objects/Color';
import { TeacherId } from '../value-objects/TeacherId';

export interface TeacherProfile {
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  notes?: string | null;
}

export class Teacher {
  private readonly _id: TeacherId;
  private readonly _name: string;
  private readonly _color: Color;
  private readonly _userId: string | null;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;
  private readonly _email: string | null;
  private readonly _phone: string | null;
  private readonly _role: string | null;
  private readonly _notes: string | null;

  private constructor(
    id: TeacherId,
    name: string,
    color: Color,
    userId: string | null,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
    email: string | null = null,
    phone: string | null = null,
    role: string | null = null,
    notes: string | null = null
  ) {
    this._id = id;
    this._name = name;
    this._color = color;
    this._userId = userId;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._email = email;
    this._phone = phone;
    this._role = role;
    this._notes = notes;
    this.validate();
  }

  // ===== 팩토리 메서드 =====

  static create(name: string, color: string, userId?: string, profile?: TeacherProfile): Teacher {
    const trimmedName = name.trim();
    const teacherId = TeacherId.generate();
    const colorValue = Color.fromString(color);
    return new Teacher(
      teacherId,
      trimmedName,
      colorValue,
      userId ?? null,
      new Date(),
      new Date(),
      profile?.email ?? null,
      profile?.phone ?? null,
      profile?.role ?? null,
      profile?.notes ?? null
    );
  }

  static restore(
    id: string,
    name: string,
    color: string,
    userId?: string | null,
    createdAt?: Date,
    updatedAt?: Date,
    profile?: TeacherProfile
  ): Teacher {
    const teacherId = TeacherId.fromString(id);
    const colorValue = Color.fromString(color);
    const created = createdAt || new Date();
    const updated = updatedAt || new Date();
    return new Teacher(
      teacherId,
      name,
      colorValue,
      userId ?? null,
      created,
      updated,
      profile?.email ?? null,
      profile?.phone ?? null,
      profile?.role ?? null,
      profile?.notes ?? null
    );
  }

  // ===== 비즈니스 로직 =====

  changeName(newName: string): Teacher {
    const trimmedName = newName.trim();
    if (trimmedName === this._name) return this;
    return new Teacher(this._id, trimmedName, this._color, this._userId, this._createdAt, new Date(), this._email, this._phone, this._role, this._notes);
  }

  changeColor(newColor: string): Teacher {
    const colorValue = Color.fromString(newColor);
    if (colorValue.equals(this._color)) return this;
    return new Teacher(this._id, this._name, colorValue, this._userId, this._createdAt, new Date(), this._email, this._phone, this._role, this._notes);
  }

  linkUser(userId: string): Teacher {
    return new Teacher(this._id, this._name, this._color, userId, this._createdAt, new Date(), this._email, this._phone, this._role, this._notes);
  }

  unlinkUser(): Teacher {
    return new Teacher(this._id, this._name, this._color, null, this._createdAt, new Date(), this._email, this._phone, this._role, this._notes);
  }

  updateProfile(profile: { name?: string; color?: string; email?: string | null; phone?: string | null; role?: string | null; notes?: string | null }): Teacher {
    const newName = profile.name !== undefined ? profile.name.trim() : this._name;
    const newColor = profile.color !== undefined ? Color.fromString(profile.color) : this._color;
    const newEmail = profile.email !== undefined ? profile.email : this._email;
    const newPhone = profile.phone !== undefined ? profile.phone : this._phone;
    const newRole = profile.role !== undefined ? profile.role : this._role;
    const newNotes = profile.notes !== undefined ? profile.notes : this._notes;
    return new Teacher(this._id, newName, newColor, this._userId, this._createdAt, new Date(), newEmail, newPhone, newRole, newNotes);
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

  get email(): string | null {
    return this._email;
  }

  get phone(): string | null {
    return this._phone;
  }

  get role(): string | null {
    return this._role;
  }

  get notes(): string | null {
    return this._notes;
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
      email: this._email,
      phone: this._phone,
      role: this._role,
      notes: this._notes,
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
      email: this._email,
      phone: this._phone,
      role: this._role,
      notes: this._notes,
    };
  }

  static fromJSON(json: TeacherJson): Teacher {
    return Teacher.restore(
      json.id,
      json.name,
      json.color,
      json.userId,
      new Date(json.createdAt),
      new Date(json.updatedAt),
      {
        email: json.email,
        phone: json.phone,
        role: json.role,
        notes: json.notes,
      }
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
  email: string | null;
  phone: string | null;
  role: string | null;
  notes: string | null;
}

export interface TeacherJson {
  id: string;
  name: string;
  color: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  notes: string | null;
}
