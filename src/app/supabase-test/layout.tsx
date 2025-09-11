import SupabaseTestPage from "./page";

export default function SupabaseTestLayout() {
  // 서버 컴포넌트에서 환경 변수 접근
  const envVars = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    nodeEnv: process.env.NODE_ENV,
  };

  return <SupabaseTestPage envVars={envVars} />;
}

