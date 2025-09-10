/**
 * 🔌 Infrastructure Repository - SupabaseStudentRepository
 *
 * Supabase를 사용한 학생 리포지토리 구현체입니다.
 */

import { StudentMapper } from '../../application/mappers/StudentMapper';
import { Student } from '../../domain/entities/Student';
import type { IStudentRepository } from '../../domain/repositories';
import { StudentId } from '../../domain/value-objects/StudentId';
import type { StudentDto } from '../../shared/types/ApplicationTypes';
import { SupabaseSingleton } from '../../utils/supabaseClient';

export class SupabaseStudentRepository implements IStudentRepository {
  private get supabase() {
    return SupabaseSingleton.getInstance();
  }

  async findById(id: StudentId): Promise<Student | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_data')
        .select('data')
        .eq('user_id', (await this.supabase.auth.getUser()).data.user?.id)
        .single();

      if (error) {
        console.error('Failed to fetch user data:', error);
        return null;
      }

      const students = data?.data?.students || [];
      const studentDto = students.find((s: StudentDto) => s.id === id.value);

      return studentDto ? StudentMapper.toDomain(studentDto) : null;
    } catch (error) {
      console.error('Error in findById:', error);
      return null;
    }
  }

  async findAll(): Promise<Student[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_data')
        .select('data')
        .eq('user_id', (await this.supabase.auth.getUser()).data.user?.id)
        .single();

      if (error) {
        console.error('Failed to fetch user data:', error);
        return [];
      }

      const students = data?.data?.students || [];
      return StudentMapper.toDomainArray(students);
    } catch (error) {
      console.error('Error in findAll:', error);
      return [];
    }
  }

  async save(student: Student): Promise<Student> {
    try {
      const studentDto = StudentMapper.toDto(student);

      // 현재 사용자 데이터 조회
      const { data: currentData, error: fetchError } = await this.supabase
        .from('user_data')
        .select('data')
        .eq('user_id', (await this.supabase.auth.getUser()).data.user?.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Failed to fetch current data:', fetchError);
        throw new Error('데이터 조회에 실패했습니다.');
      }

      const currentUserData = currentData?.data || {
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        lastModified: new Date().toISOString(),
        version: '1.0.0',
      };

      // 학생 목록 업데이트
      const students = currentUserData.students || [];
      const existingIndex = students.findIndex(
        (s: StudentDto) => s.id === studentDto.id
      );

      if (existingIndex >= 0) {
        students[existingIndex] = studentDto;
      } else {
        students.push(studentDto);
      }

      // 데이터 저장
      const updatedData = {
        ...currentUserData,
        students,
        lastModified: new Date().toISOString(),
      };

      const { error: upsertError } = await this.supabase
        .from('user_data')
        .upsert({
          user_id: (await this.supabase.auth.getUser()).data.user?.id,
          data: updatedData,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) {
        console.error('Failed to save student:', upsertError);
        throw new Error('학생 저장에 실패했습니다.');
      }

      return student;
    } catch (error) {
      console.error('Error in save:', error);
      throw error;
    }
  }

  async delete(id: StudentId): Promise<void> {
    try {
      // 현재 사용자 데이터 조회
      const { data: currentData, error: fetchError } = await this.supabase
        .from('user_data')
        .select('data')
        .eq('user_id', (await this.supabase.auth.getUser()).data.user?.id)
        .single();

      if (fetchError) {
        console.error('Failed to fetch current data:', fetchError);
        throw new Error('데이터 조회에 실패했습니다.');
      }

      const currentUserData = currentData?.data || { students: [] };
      const students = currentUserData.students || [];
      const filteredStudents = students.filter(
        (s: StudentDto) => s.id !== id.value
      );

      if (filteredStudents.length === students.length) {
        throw new Error('삭제할 학생을 찾을 수 없습니다.');
      }

      // 데이터 저장
      const updatedData = {
        ...currentUserData,
        students: filteredStudents,
        lastModified: new Date().toISOString(),
      };

      const { error: upsertError } = await this.supabase
        .from('user_data')
        .upsert({
          user_id: (await this.supabase.auth.getUser()).data.user?.id,
          data: updatedData,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) {
        console.error('Failed to delete student:', upsertError);
        throw new Error('학생 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  }

  async findByName(name: string): Promise<Student | null> {
    try {
      const students = await this.findAll();
      return (
        students.find(
          s => s.name.toLowerCase() === name.trim().toLowerCase()
        ) || null
      );
    } catch (error) {
      console.error('Error in findByName:', error);
      return null;
    }
  }

  async exists(id: StudentId): Promise<boolean> {
    try {
      const student = await this.findById(id);
      return student !== null;
    } catch (error) {
      console.error('Error in exists:', error);
      return false;
    }
  }

  async count(): Promise<number> {
    try {
      const students = await this.findAll();
      return students.length;
    } catch (error) {
      console.error('Error in count:', error);
      return 0;
    }
  }
}
