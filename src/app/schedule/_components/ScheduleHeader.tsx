import ColorByToggle from "../../../components/molecules/ColorByToggle";
import { HelpTooltip } from "../../../components/molecules/HelpTooltip";
import SegmentedButton from "../../../components/atoms/SegmentedButton";
import type { ColorByMode } from "../../../hooks/useColorBy";
import type { ScheduleViewMode } from "../../../hooks/useScheduleView";

type Props = {
  dataLoading: boolean;
  error?: string;
  colorBy?: ColorByMode;
  onColorByChange?: (mode: ColorByMode) => void;
  viewMode: ScheduleViewMode;
  onViewModeChange: (mode: ScheduleViewMode) => void;
};

const VIEW_MODES = [
  { label: "일별", value: "daily" as ScheduleViewMode },
  { label: "주간", value: "weekly" as ScheduleViewMode },
  { label: "월별", value: "monthly" as ScheduleViewMode },
] as const;

export default function ScheduleHeader({
  dataLoading,
  error,
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
          <SegmentedButton
            options={VIEW_MODES}
            value={viewMode}
            onChange={onViewModeChange}
            aria-label="뷰 모드"
          />
          {onColorByChange && (
            <div className="flex items-center gap-1">
              <ColorByToggle colorBy={colorBy} onChange={onColorByChange} />
              <HelpTooltip
                label="색상 기준 도움말"
                content="과목별로 색을 구분하거나, 학생·강사 기준으로 전환할 수 있습니다."
              />
            </div>
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
    </div>
  );
}
