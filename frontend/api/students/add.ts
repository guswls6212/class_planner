import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import type {
  AddStudentRequest,
  ApiResponse,
  SetCorsHeaders,
  Student,
} from '../../src/types/apiTypes';

// CORS 헤더 설정 함수
const setCorsHeaders: SetCorsHeaders = res => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS 설정
  setCorsHeaders(res);

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { studentName, userId }: AddStudentRequest = req.body;

    // 데이터 유효성 검사
    if (!studentName || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: studentName and userId are required',
      });
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 새로운 학생 데이터 생성
    const newStudent: Student = {
      id: crypto.randomUUID(),
      name: studentName.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 기존 사용자 데이터 조회
    const { data: existingData, error: fetchError } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('사용자 데이터 조회 에러:', fetchError);
      throw fetchError;
    }

    // 기존 데이터가 없으면 새로 생성, 있으면 업데이트
    let updatedData;
    if (!existingData) {
      // 새 사용자 데이터 생성
      updatedData = {
        students: [newStudent],
        subjects: [],
        sessions: [],
        settings: {
          timezone: 'Asia/Seoul',
          working_hours: { start: '09:00', end: '22:00' },
          default_subject_color: '#3B82F6',
        },
        version: '1.0',
      };

      const { error: insertError } = await supabase
        .from('user_data')
        .insert({ user_id: userId, data: updatedData });

      if (insertError) {
        console.error('사용자 데이터 생성 에러:', insertError);
        throw insertError;
      }
    } else {
      // 기존 데이터에 학생 추가
      const currentData = existingData.data;
      const students = currentData.students || [];

      // 중복 이름 체크
      const isDuplicate = students.some(
        (student: Student) =>
          student.name.toLowerCase() === newStudent.name.toLowerCase(),
      );

      if (isDuplicate) {
        return res.status(400).json({
          error: '이미 존재하는 학생 이름입니다.',
          success: false,
        });
      }

      updatedData = {
        ...currentData,
        students: [...students, newStudent],
      };

      const { error: updateError } = await supabase
        .from('user_data')
        .update({ data: updatedData })
        .eq('user_id', userId);

      if (updateError) {
        console.error('사용자 데이터 업데이트 에러:', updateError);
        throw updateError;
      }
    }

    // 성공 로깅
    console.log(`[성공] 학생 추가: ${studentName}, 사용자 ID: ${userId}`);

    // 성공 응답
    const response: ApiResponse<Student> = {
      success: true,
      data: newStudent,
      message: '학생이 성공적으로 추가되었습니다.',
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    // 에러 로깅
    console.error('[실패] 학생 추가 에러:', error instanceof Error ? error.message : '알 수 없는 오류');

    // 에러 응답
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : '서버 내부 오류가 발생했습니다.',
    };

    res.status(500).json(response);
  }
}
