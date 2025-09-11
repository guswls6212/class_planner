"use client";

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useState } from "react";

interface SupabaseTestPageProps {
  envVars?: {
    supabaseUrl?: string;
    supabaseKey?: string;
    nodeEnv?: string;
  };
}

function SupabaseTestPage({ envVars }: SupabaseTestPageProps) {
  const [connectionStatus, setConnectionStatus] =
    useState<string>("테스트 중...");
  const [testResults, setTestResults] = useState<any[]>([]);
  const [envDebugInfo, setEnvDebugInfo] = useState<any>({});

  useEffect(() => {
    const testSupabaseConnection = async () => {
      const results: any[] = [];

      try {
        // 0. 환경 변수 디버깅 정보 수집 (props에서 받은 값 사용)
        const envDebug = {
          allEnvKeys: envVars ? Object.keys(envVars) : [],
          supabaseUrl: envVars?.supabaseUrl,
          supabaseKey: envVars?.supabaseKey,
          nodeEnv: envVars?.nodeEnv,
          allProcessEnv: envVars,
        };
        setEnvDebugInfo(envDebug);

        // 1. 환경 변수 확인 (props에서 받은 값 사용)
        const supabaseUrl = envVars?.supabaseUrl;
        const supabaseKey = envVars?.supabaseKey;

        results.push({
          test: "환경 변수 확인",
          status: "info",
          message: `URL: ${supabaseUrl ? "설정됨" : "없음"}, Key: ${
            supabaseKey ? "설정됨" : "없음"
          }`,
        });

        // 환경 변수가 없으면 테스트 중단
        if (!supabaseUrl || !supabaseKey) {
          results.push({
            test: "환경 변수 검증",
            status: "error",
            message:
              "환경 변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.",
          });
          setConnectionStatus("환경 변수 오류");
          setTestResults(results);
          return;
        }

        // 2. Supabase 클라이언트 확인
        results.push({
          test: "Supabase 클라이언트",
          status: supabase ? "success" : "error",
          message: supabase ? "클라이언트 생성됨" : "클라이언트 생성 실패",
        });

        // 3. 기본 연결 테스트
        const { data, error } = await supabase
          .from("user_data")
          .select("count")
          .limit(1);

        if (error) {
          results.push({
            test: "데이터베이스 연결",
            status: "error",
            message: `연결 실패: ${error.message}`,
          });
        } else {
          results.push({
            test: "데이터베이스 연결",
            status: "success",
            message: "연결 성공!",
          });
        }

        // 4. 인증 상태 확인
        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession();

        results.push({
          test: "인증 상태",
          status: authError ? "warning" : "success",
          message: authError
            ? `인증 오류: ${authError.message}`
            : session
            ? "로그인됨"
            : "로그아웃됨",
        });

        setConnectionStatus("테스트 완료");
        setTestResults(results);
      } catch (error) {
        results.push({
          test: "전체 테스트",
          status: "error",
          message: `테스트 중 오류: ${error}`,
        });
        setConnectionStatus("테스트 실패");
        setTestResults(results);
      }
    };

    testSupabaseConnection();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>🔍 Supabase 연결 테스트</h1>
      <p>
        <strong>상태:</strong> {connectionStatus}
      </p>

      <h2>테스트 결과:</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {testResults.map((result, index) => (
          <div
            key={index}
            style={{
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
              backgroundColor:
                result.status === "success"
                  ? "#d4edda"
                  : result.status === "error"
                  ? "#f8d7da"
                  : result.status === "warning"
                  ? "#fff3cd"
                  : "#e2e3e5",
            }}
          >
            <strong>{result.test}:</strong> {result.message}
          </div>
        ))}
      </div>

      <h2>환경 변수:</h2>
      <div
        style={{
          backgroundColor: "#f8f9fa",
          padding: "10px",
          borderRadius: "5px",
          marginBottom: "20px",
        }}
      >
        <p>
          <strong>NEXT_PUBLIC_SUPABASE_URL:</strong>{" "}
          {envVars?.supabaseUrl || "없음"}
        </p>
        <p>
          <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong>{" "}
          {envVars?.supabaseKey ? "설정됨" : "없음"}
        </p>
        <p>
          <strong>실제 URL 값:</strong>{" "}
          {envVars?.supabaseUrl || "환경 변수 없음"}
        </p>
      </div>

      <h2>🔍 환경 변수 디버깅 정보:</h2>
      <div
        style={{
          backgroundColor: "#e3f2fd",
          padding: "15px",
          borderRadius: "5px",
          marginBottom: "20px",
        }}
      >
        <p>
          <strong>NODE_ENV:</strong> {envDebugInfo.nodeEnv || "없음"}
        </p>
        <p>
          <strong>NEXT_PUBLIC_ 키들:</strong>{" "}
          {envDebugInfo.allEnvKeys?.join(", ") || "없음"}
        </p>
        <p>
          <strong>Supabase URL:</strong> {envDebugInfo.supabaseUrl || "없음"}
        </p>
        <p>
          <strong>Supabase Key:</strong>{" "}
          {envDebugInfo.supabaseKey ? "설정됨" : "없음"}
        </p>
        <details style={{ marginTop: "10px" }}>
          <summary>
            <strong>전체 process.env 객체 보기</strong>
          </summary>
          <pre
            style={{
              backgroundColor: "#f5f5f5",
              padding: "10px",
              borderRadius: "3px",
              fontSize: "12px",
              overflow: "auto",
              maxHeight: "200px",
            }}
          >
            {JSON.stringify(envDebugInfo.allProcessEnv, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

export default SupabaseTestPage;
