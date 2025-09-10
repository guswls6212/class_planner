/**
 * 🔌 Infrastructure Repository - HybridStudentRepository
 *
 * LocalStorage와 Supabase를 모두 사용하는 하이브리드 학생 리포지토리입니다.
 * 로컬 우선, 서버 동기화 전략을 사용합니다.
 */

import { Student } from '../../domain/entities/Student';
import type { IStudentRepository } from '../../domain/repositories';
import { StudentId } from '../../domain/value-objects/StudentId';
import { LocalStorageStudentRepository } from './LocalStorageStudentRepository';
import { SupabaseStudentRepository } from './SupabaseStudentRepository';

export class HybridStudentRepository implements IStudentRepository {
  private localStorageRepo: LocalStorageStudentRepository;
  private supabaseRepo: SupabaseStudentRepository;

  constructor() {
    this.localStorageRepo = new LocalStorageStudentRepository();
    this.supabaseRepo = new SupabaseStudentRepository();
  }

  async findById(id: StudentId): Promise<Student | null> {
    try {
      // 1. 로컬에서 먼저 조회
      const localStudent = await this.localStorageRepo.findById(id);
      if (localStudent) {
        return localStudent;
      }

      // 2. 로컬에 없으면 서버에서 조회
      const serverStudent = await this.supabaseRepo.findById(id);
      if (serverStudent) {
        // 3. 서버에서 조회한 데이터를 로컬에 캐시
        await this.localStorageRepo.save(serverStudent);
        return serverStudent;
      }

      return null;
    } catch (error) {
      console.error('Error in hybrid findById:', error);
      // 서버 에러 시 로컬 데이터만 반환
      return await this.localStorageRepo.findById(id);
    }
  }

  async findAll(): Promise<Student[]> {
    try {
      // 1. 로컬과 서버 데이터를 병렬로 조회
      const [localStudents, serverStudents] = await Promise.allSettled([
        this.localStorageRepo.findAll(),
        this.supabaseRepo.findAll(),
      ]);

      const local =
        localStudents.status === 'fulfilled' ? localStudents.value : [];
      const server =
        serverStudents.status === 'fulfilled' ? serverStudents.value : [];

      // 2. 서버 데이터가 더 최신이면 로컬 업데이트
      if (server.length > 0 && server.length !== local.length) {
        // 서버 데이터로 로컬 동기화
        for (const serverStudent of server) {
          await this.localStorageRepo.save(serverStudent);
        }
        return server;
      }

      // 3. 로컬 데이터 반환
      return local;
    } catch (error) {
      console.error('Error in hybrid findAll:', error);
      // 에러 시 로컬 데이터만 반환
      return await this.localStorageRepo.findAll();
    }
  }

  async save(student: Student): Promise<Student> {
    try {
      // 1. 로컬에 먼저 저장
      const savedStudent = await this.localStorageRepo.save(student);

      // 2. 서버에도 저장 (백그라운드)
      this.supabaseRepo.save(student).catch(error => {
        console.warn('Failed to sync student to server:', error);
        // 서버 저장 실패는 로그만 남기고 계속 진행
      });

      return savedStudent;
    } catch (error) {
      console.error('Error in hybrid save:', error);
      throw error;
    }
  }

  async delete(id: StudentId): Promise<void> {
    try {
      // 1. 로컬에서 삭제
      await this.localStorageRepo.delete(id);

      // 2. 서버에서도 삭제 (백그라운드)
      this.supabaseRepo.delete(id).catch(error => {
        console.warn('Failed to delete student from server:', error);
        // 서버 삭제 실패는 로그만 남기고 계속 진행
      });
    } catch (error) {
      console.error('Error in hybrid delete:', error);
      throw error;
    }
  }

  async findByName(name: string): Promise<Student | null> {
    try {
      // 1. 로컬에서 먼저 검색
      const localStudent = await this.localStorageRepo.findByName(name);
      if (localStudent) {
        return localStudent;
      }

      // 2. 로컬에 없으면 서버에서 검색
      const serverStudent = await this.supabaseRepo.findByName(name);
      if (serverStudent) {
        // 3. 서버에서 조회한 데이터를 로컬에 캐시
        await this.localStorageRepo.save(serverStudent);
        return serverStudent;
      }

      return null;
    } catch (error) {
      console.error('Error in hybrid findByName:', error);
      // 서버 에러 시 로컬 데이터만 반환
      return await this.localStorageRepo.findByName(name);
    }
  }

  async exists(id: StudentId): Promise<boolean> {
    try {
      // 로컬과 서버 중 하나라도 존재하면 true
      const [localExists, serverExists] = await Promise.allSettled([
        this.localStorageRepo.exists(id),
        this.supabaseRepo.exists(id),
      ]);

      return (
        (localExists.status === 'fulfilled' && localExists.value) ||
        (serverExists.status === 'fulfilled' && serverExists.value)
      );
    } catch (error) {
      console.error('Error in hybrid exists:', error);
      // 에러 시 로컬 데이터만 확인
      return await this.localStorageRepo.exists(id);
    }
  }

  async count(): Promise<number> {
    try {
      // 로컬 데이터 수 반환 (가장 빠름)
      return await this.localStorageRepo.count();
    } catch (error) {
      console.error('Error in hybrid count:', error);
      return 0;
    }
  }

  /**
   * 서버와 로컬 데이터를 강제 동기화합니다.
   */
  async syncWithServer(): Promise<void> {
    try {
      const serverStudents = await this.supabaseRepo.findAll();

      // 로컬 데이터를 서버 데이터로 완전 교체
      for (const student of serverStudents) {
        await this.localStorageRepo.save(student);
      }

      console.log(`Synced ${serverStudents.length} students from server`);
    } catch (error) {
      console.error('Failed to sync with server:', error);
      throw error;
    }
  }

  /**
   * 로컬 데이터를 서버에 강제 업로드합니다.
   */
  async uploadToServer(): Promise<void> {
    try {
      const localStudents = await this.localStorageRepo.findAll();

      // 모든 로컬 학생을 서버에 저장
      for (const student of localStudents) {
        await this.supabaseRepo.save(student);
      }

      console.log(`Uploaded ${localStudents.length} students to server`);
    } catch (error) {
      console.error('Failed to upload to server:', error);
      throw error;
    }
  }
}
