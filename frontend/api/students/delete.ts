import { createClient } from '@supabase/supabase-js';
import type {
  ApiResponse,
  DeleteStudentRequest,
  SetCorsHeaders,
  Student,
} from '../../src/types/apiTypes';

// CORS 헤더 설정 함수
const setCorsHeaders: SetCorsHeaders = res => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(req: any, res: any) {
  // CORS 설정
  setCorsHeaders(res);

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // DELETE 요청만 허용
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { studentId, userId }: DeleteStudentRequest = req.body;

    // 데이터 유효성 검사
    if (!studentId || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: studentId and userId are required',
      });
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 기존 사용자 데이터 조회
    const { data: userData, error: fetchError } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('사용자 데이터 조회 에러:', fetchError);
      throw fetchError;
    }

    if (!userData) {
      return res.status(404).json({
        error: '사용자 데이터를 찾을 수 없습니다.',
        success: false,
      });
    }

    // JSONB에서 학생 목록 추출
    const currentData = userData.data;
    const students: Student[] = currentData.students || [];

    // 삭제할 학생 찾기
    const studentToDelete = students.find(student => student.id === studentId);

    if (!studentToDelete) {
      return res.status(404).json({
        error: '학생을 찾을 수 없습니다.',
        success: false,
      });
    }

    // 학생 목록에서 해당 학생 제거
    const updatedStudents = students.filter(
      student => student.id !== studentId
    );

    // 세션에서도 해당 학생 제거
    const sessions = currentData.sessions || [];
    const updatedSessions = sessions.map((session: any) => ({
      ...session,
      student_ids:
        session.student_ids?.filter((id: string) => id !== studentId) || [],
    }));

    // 업데이트된 데이터 구성
    const updatedData = {
      ...currentData,
      students: updatedStudents,
      sessions: updatedSessions,
    };

    // 데이터베이스 업데이트
    const { error: updateError } = await supabase
      .from('user_data')
      .update({ data: updatedData })
      .eq('user_id', userId);

    if (updateError) {
      console.error('사용자 데이터 업데이트 에러:', updateError);
      throw updateError;
    }

    // 성공 로깅
    console.log(`[성공] 학생 삭제: ${studentToDelete.name}, ID ${studentId}`);

    // 성공 응답
    const response: ApiResponse<Student> = {
      success: true,
      data: studentToDelete,
      message: '학생이 성공적으로 삭제되었습니다.',
    };

    res.status(200).json(response);
  } catch (error: any) {
    // 에러 로깅
    console.error('[실패] 학생 삭제 에러:', error.message);

    // 에러 응답
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: error.message || '서버 내부 오류가 발생했습니다.',
    };

    res.status(500).json(response);
  }
}
