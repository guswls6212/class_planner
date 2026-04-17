/**
 * 🏢 Domain Entity - Student
 *
 * 학생 도메인 엔티티입니다. 학생과 관련된 모든 비즈니스 로직을 포함합니다.
 * 불변성과 캡슐화를 통해 데이터 무결성을 보장합니다.
 */

import { StudentId } from "../value-objects/StudentId";

export interface StudentCreateOptions {
  gender?: string;
  birthDate?: string;
  grade?: string;
  school?: string;
  phone?: string;
}

export interface StudentRestoreOptions extends StudentCreateOptions {
  createdAt?: Date;
  updatedAt?: Date;
}

export class Student {
  private readonly _id: StudentId;
  private readonly _name: string;
  private readonly _gender?: string;
  private readonly _birthDate?: string;
  private readonly _grade?: string;
  private readonly _school?: string;
  private readonly _phone?: string;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(
    id: StudentId,
    name: string,
    options: {
      gender?: string;
      birthDate?: string;
      grade?: string;
      school?: string;
      phone?: string;
      createdAt?: Date;
      updatedAt?: Date;
    } = {}
  ) {
    this._id = id;
    this._name = name;
    this._gender = options.gender;
    this._birthDate = options.birthDate;
    this._grade = options.grade;
    this._school = options.school;
    this._phone = options.phone;
    this._createdAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
    this.validate();
  }

  // ===== 팩토리 메서드 =====

  /**
   * 새로운 학생을 생성합니다.
   */
  static create(name: string, options?: StudentCreateOptions): Student {
    const trimmedName = name.trim();
    const studentId = StudentId.generate();

    return new Student(studentId, trimmedName, options ?? {});
  }

  /**
   * 기존 데이터로부터 학생을 복원합니다.
   */
  static restore(
    id: string,
    name: string,
    options?: StudentRestoreOptions
  ): Student {
    const studentId = StudentId.fromString(id);

    return new Student(studentId, name, {
      gender: options?.gender,
      birthDate: options?.birthDate,
      grade: options?.grade,
      school: options?.school,
      phone: options?.phone,
      createdAt: options?.createdAt ?? new Date(),
      updatedAt: options?.updatedAt ?? new Date(),
    });
  }

  // ===== 비즈니스 로직 =====

  /**
   * 학생 이름을 변경합니다.
   */
  changeName(newName: string): Student {
    const trimmedName = newName.trim();

    if (trimmedName === this._name) {
      return this; // 변경사항이 없으면 현재 인스턴스 반환
    }

    return new Student(this._id, trimmedName, {
      gender: this._gender,
      birthDate: this._birthDate,
      grade: this._grade,
      school: this._school,
      phone: this._phone,
      createdAt: this._createdAt,
      updatedAt: new Date(), // updatedAt 업데이트
    });
  }

  /**
   * 프로필 필드를 일괄 변경합니다. 불변성을 보장하며 새 인스턴스를 반환합니다.
   */
  changeProfile(updates: {
    gender?: string;
    birthDate?: string;
    grade?: string;
    school?: string;
    phone?: string;
  }): Student {
    return new Student(this._id, this._name, {
      gender: updates.gender !== undefined ? updates.gender : this._gender,
      birthDate: updates.birthDate !== undefined ? updates.birthDate : this._birthDate,
      grade: updates.grade !== undefined ? updates.grade : this._grade,
      school: updates.school !== undefined ? updates.school : this._school,
      phone: updates.phone !== undefined ? updates.phone : this._phone,
      createdAt: this._createdAt,
      updatedAt: new Date(), // updatedAt 업데이트
    });
  }

  /**
   * 학생 이름이 유효한지 검증합니다.
   */
  static validateName(name: string): ValidationResult {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return {
        isValid: false,
        errors: [
          {
            field: "name",
            message: "학생 이름을 입력해주세요.",
            code: "NAME_REQUIRED",
          },
        ],
      };
    }

    if (trimmedName.length < 2) {
      return {
        isValid: false,
        errors: [
          {
            field: "name",
            message: "학생 이름은 2글자 이상이어야 합니다.",
            code: "NAME_TOO_SHORT",
          },
        ],
      };
    }

    if (trimmedName.length > 20) {
      return {
        isValid: false,
        errors: [
          {
            field: "name",
            message: "학생 이름은 20글자 이하여야 합니다.",
            code: "NAME_TOO_LONG",
          },
        ],
      };
    }

    // 특수문자 검증
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
    if (specialCharRegex.test(trimmedName)) {
      return {
        isValid: false,
        errors: [
          {
            field: "name",
            message: "학생 이름에는 특수문자를 사용할 수 없습니다.",
            code: "NAME_INVALID_CHARACTERS",
          },
        ],
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * 전화번호가 유효한지 검증합니다. 빈 값/undefined는 유효합니다 (선택 필드).
   */
  static validatePhone(phone: string | undefined): ValidationResult {
    if (!phone || phone.trim() === "") {
      return { isValid: true, errors: [] };
    }

    // 한국 전화번호 형식: 010-1234-5678, 01012345678, 010-123-5678 등
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
    if (!phoneRegex.test(phone.trim())) {
      return {
        isValid: false,
        errors: [
          {
            field: "phone",
            message: "올바른 전화번호 형식이 아닙니다.",
            code: "PHONE_INVALID_FORMAT",
          },
        ],
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * 학생 이름이 중복되는지 확인합니다.
   */
  static isNameDuplicate(name: string, existingStudents: Student[]): boolean {
    const trimmedName = name.trim().toLowerCase();
    return existingStudents.some(
      (student) => student.name.toLowerCase() === trimmedName
    );
  }

  // ===== 내부 검증 =====

  private validate(): void {
    const validation = Student.validateName(this._name);
    if (!validation.isValid) {
      throw new Error(
        `Invalid student: ${validation.errors.map((e) => e.message).join(", ")}`
      );
    }
  }

  // ===== 접근자 (Getters) =====

  get id(): StudentId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get gender(): string | undefined {
    return this._gender;
  }

  get birthDate(): string | undefined {
    return this._birthDate;
  }

  get grade(): string | undefined {
    return this._grade;
  }

  get school(): string | undefined {
    return this._school;
  }

  get phone(): string | undefined {
    return this._phone;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ===== 직렬화 =====

  /**
   * 도메인 엔티티를 DTO로 변환합니다.
   */
  toDto(): StudentDto {
    return {
      id: this._id.value,
      name: this._name,
      gender: this._gender,
      birthDate: this._birthDate,
      grade: this._grade,
      school: this._school,
      phone: this._phone,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  /**
   * 도메인 엔티티를 JSON으로 직렬화합니다.
   */
  toJSON(): StudentJson {
    return {
      id: this._id.value,
      name: this._name,
      gender: this._gender,
      birthDate: this._birthDate,
      grade: this._grade,
      school: this._school,
      phone: this._phone,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  /**
   * JSON으로부터 도메인 엔티티를 복원합니다.
   */
  static fromJSON(json: StudentJson): Student {
    return Student.restore(json.id, json.name, {
      gender: json.gender,
      birthDate: json.birthDate,
      grade: json.grade,
      school: json.school,
      phone: json.phone,
      createdAt: new Date(json.createdAt),
      updatedAt: new Date(json.updatedAt),
    });
  }

  // ===== 동등성 비교 =====

  equals(other: Student): boolean {
    return this._id.equals(other._id);
  }

  toString(): string {
    return `Student(id=${this._id.value}, name=${this._name})`;
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

export interface StudentDto {
  id: string;
  name: string;
  gender?: string;
  birthDate?: string;
  grade?: string;
  school?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentJson {
  id: string;
  name: string;
  gender?: string;
  birthDate?: string;
  grade?: string;
  school?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}
