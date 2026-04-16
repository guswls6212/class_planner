type Props = {
  dataLoading: boolean;
  error?: string;
  selectedStudentName?: string;
};

export default function ScheduleHeader({
  dataLoading,
  error,
  selectedStudentName,
}: Props) {
  return (
    <div className="mb-4 flex items-center justify-between border-b border-[--color-border] pb-3">
      <h2 className="text-2xl font-semibold text-[--color-text-primary]">주간 시간표</h2>
      {dataLoading && (
        <div className="text-sm text-blue-500">
          {error
            ? "데이터 로드 중 오류가 발생했습니다."
            : "세션 데이터를 로드 중..."}
        </div>
      )}
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
        <p className="text-gray-500">
          {selectedStudentName} 학생의 시간표입니다. 다른 학생을 선택하거나 선택
          해제하여 전체 시간표를 볼 수 있습니다.
        </p>
      ) : (
        <p className="text-gray-500">
          전체 학생의 시간표입니다. 수강생 리스트에서 학생을 선택하면 해당
          학생의 시간표만 볼 수 있습니다.
        </p>
      )}
    </div>
  );
}
