/**
 * API 관련 타입 정의
 */

// 학생 타입
export interface Student {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// 학생 추가 요청 타입
export interface AddStudentRequest {
  studentName: string;
  userId: string;
}

// 학생 삭제 요청 타입
export interface DeleteStudentRequest {
  studentId: string;
  userId: string;
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  message?: string;
}

// CORS 헤더 설정 함수 타입
export type SetCorsHeaders = (res: any) => void;

// Next.js API 타입들 (re-export)
export type { NextApiRequest, NextApiResponse } from 'next';
