import Link from "next/link";

export const metadata = {
  title: "오프라인 — Class Planner",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#0b0b0b] px-6 text-center text-white">
      <div className="text-6xl">📡</div>
      <h1 className="text-2xl font-bold text-amber-400">오프라인 상태입니다</h1>
      <p className="max-w-sm text-sm text-slate-300">
        네트워크에 연결할 수 없습니다.
        <br />
        저장된 시간표는 <span className="font-semibold text-amber-300">/schedule</span>에서 계속 확인할 수
        있어요.
      </p>
      <Link
        href="/schedule"
        className="rounded-md bg-amber-500 px-6 py-3 text-sm font-medium text-black transition hover:bg-amber-400"
      >
        시간표로 이동
      </Link>
    </main>
  );
}
