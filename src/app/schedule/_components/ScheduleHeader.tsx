import styles from "../Schedule.module.css";

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
    <div className={styles.pageHeader}>
      <h2>주간 시간표</h2>
      {dataLoading && (
        <div style={{ color: "var(--color-blue-500)", fontSize: "14px" }}>
          {error
            ? "데이터 로드 중 오류가 발생했습니다."
            : "세션 데이터를 로드 중..."}
        </div>
      )}
      {error && (
        <div
          style={{
            color: "var(--color-red-500)",
            fontSize: "14px",
            backgroundColor: "var(--color-red-50)",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid var(--color-red-200)",
            marginTop: "8px",
          }}
        >
          ⚠️ {error}
          <br />
          <small style={{ color: "var(--color-gray-600)" }}>
            로컬 데이터로 계속 작업할 수 있습니다.
          </small>
        </div>
      )}
      {selectedStudentName ? (
        <p style={{ color: "var(--color-gray-500)" }}>
          {selectedStudentName} 학생의 시간표입니다. 다른 학생을 선택하거나 선택
          해제하여 전체 시간표를 볼 수 있습니다.
        </p>
      ) : (
        <p style={{ color: "var(--color-gray-500)" }}>
          전체 학생의 시간표입니다. 수강생 리스트에서 학생을 선택하면 해당
          학생의 시간표만 볼 수 있습니다.
        </p>
      )}
    </div>
  );
}
