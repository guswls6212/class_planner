import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import type {
  ApiResponse,
  SetCorsHeaders,
  Student,
} from '../../src/types/apiTypes';

// CORS 헤더 설정 함수
const setCorsHeaders: SetCorsHeaders = res => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // CORS 설정
  setCorsHeaders(res);

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET 요청만 허용
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId } = req.query;

    // userId 검증
    if (!userId) {
      return res.status(400).json({
        error: 'Missing required parameter: userId',
      });
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 사용자 데이터 조회
    const { data: userData, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 데이터가 없는 경우 빈 배열 반환
        const response: ApiResponse<Student[]> = {
          success: true,
          data: [],
          message: '학생 목록이 비어있습니다.',
        };
        return res.status(200).json(response);
      }

      console.error('사용자 데이터 조회 에러:', error);
      throw error;
    }

    // JSONB에서 학생 목록 추출
    const students: Student[] = userData.data.students || [];

    // 성공 로깅
    console.log(
      `[성공] 학생 목록 조회: 사용자 ID ${userId}, ${students.length}명`,
    );

    // 성공 응답
    const response: ApiResponse<Student[]> = {
      success: true,
      data: students,
      message: `${students.length}명의 학생을 조회했습니다.`,
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    // 에러 로깅
    console.error(
      '[실패] 학생 목록 조회 에러:',
      error instanceof Error ? error.message : '알 수 없는 오류',
    );

    // 에러 응답
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : '서버 내부 오류가 발생했습니다.',
    };

    res.status(500).json(response);
  }
}
