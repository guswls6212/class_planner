import SyncStatusDot from "@/components/atoms/SyncStatusDot";

type Props = {
  dataLoading: boolean;
  error?: string;
  title: string;
  isSyncingSession?: boolean;
  /**
   * academies.schedule_updated_at — 마지막으로 sessions 테이블이 변경된 시각.
   * 멀티 어드민 환경에서 다른 사용자의 변경 시각을 표시하기 위함. null이면 숨김.
   */
  scheduleUpdatedAt?: string | null;
  /** 동기화 큐 모달의 retry/discard 액션에 사용 — anonymous면 null. */
  userId?: string | null;
};

function formatScheduleUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScheduleHeader({
  dataLoading,
  error,
  title,
  isSyncingSession = false,
  scheduleUpdatedAt = null,
  userId = null,
}: Props) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-[--color-text-primary]">{title}</h2>
        {isSyncingSession && (
          <span className="text-xs text-[--color-text-secondary] opacity-70">저장 중...</span>
        )}
        {dataLoading && !error && !isSyncingSession && (
          <span className="text-sm text-blue-500">로드 중...</span>
        )}
        {scheduleUpdatedAt && (
          <span
            className="ml-auto text-[10px] text-[var(--color-text-muted)] hidden sm:block"
            data-testid="schedule-updated-at"
            title="시간표가 마지막으로 변경된 시각 (sessions CRUD 시 자동 갱신)"
          >
            {formatScheduleUpdatedAt(scheduleUpdatedAt)} 수정
          </span>
        )}
        <SyncStatusDot userId={userId} />
      </div>
      {error && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">
          ⚠️ {error}
          <br />
          <small className="text-gray-600">
            로컬 데이터로 계속 작업할 수 있습니다.
          </small>
        </div>
      )}
    </div>
  );
}
