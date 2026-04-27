type Props = {
  dataLoading: boolean;
  error?: string;
  title: string;
};

export default function ScheduleHeader({ dataLoading, error, title }: Props) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-[--color-text-primary]">{title}</h2>
        {dataLoading && !error && (
          <span className="text-sm text-blue-500">로드 중...</span>
        )}
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
