import ColorByToggle from "../../../components/molecules/ColorByToggle";
import type { ColorByMode } from "../../../hooks/useColorBy";
import type { ScheduleViewMode } from "../../../hooks/useScheduleView";

type Props = {
  dataLoading: boolean;
  error?: string;
  selectedStudentName?: string;
  colorBy?: ColorByMode;
  onColorByChange?: (mode: ColorByMode) => void;
  viewMode: ScheduleViewMode;
  onViewModeChange: (mode: ScheduleViewMode) => void;
};

export default function ScheduleHeader({
  dataLoading,
  error,
  selectedStudentName,
  colorBy = "subject",
  onColorByChange,
  viewMode,
  onViewModeChange,
}: Props) {
  const title =
    viewMode === "daily"
      ? "일별 시간표"
      : viewMode === "monthly"
        ? "월별 시간표"
        : "주간 시간표";

  return (
    <div className="mb-4 border-b border-[--color-border] pb-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[--color-text-primary]">{title}</h2>
        <div className="flex items-center gap-3">
          {dataLoading && (
            <div className="text-sm text-blue-500">
              {error
                ? "데이터 로드 중 오류가 발생했습니다."
                : "세션 데이터를 로드 중..."}
            </div>
          )}
          {/* View mode segmented toggle */}
          <div className="flex rounded-md overflow-hidden border border-[var(--color-border)]">
            <button
              onClick={() => onViewModeChange("daily")}
              className={`px-3 py-1 text-sm transition-colors ${
                viewMode === "daily"
                  ? "bg-accent text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)]"
              }`}
            >
              일별
            </button>
            <button
              onClick={() => onViewModeChange("weekly")}
              className={`px-3 py-1 text-sm transition-colors ${
                viewMode === "weekly"
                  ? "bg-accent text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)]"
              }`}
            >
              주간
            </button>
            <button
              onClick={() => onViewModeChange("monthly")}
              className={`px-3 py-1 text-sm transition-colors ${
                viewMode === "monthly"
                  ? "bg-accent text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)]"
              }`}
            >
              월별
            </button>
          </div>
          {onColorByChange && (
            <ColorByToggle colorBy={colorBy} onChange={onColorByChange} />
          )}
        </div>
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
      {selectedStudentName ? (
        <p className="mt-1 text-sm text-[--color-text-secondary]">
          {selectedStudentName} 학생의 시간표입니다. 다른 학생을 선택하거나 선택
          해제하여 전체 시간표를 볼 수 있습니다.
        </p>
      ) : (
        <p className="mt-1 text-sm text-[--color-text-secondary]">
          전체 학생의 시간표입니다. 수강생 리스트에서 학생을 선택하면 해당
          학생의 시간표만 볼 수 있습니다.
        </p>
      )}
    </div>
  );
}
