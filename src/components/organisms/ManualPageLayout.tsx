import React from "react";

const ManualPageLayout: React.FC = () => {
  return (
    <div
      data-testid="manual-page"
      className="manual-page"
      style={{
        padding: "32px",
        maxWidth: "800px",
        margin: "0 auto",
        lineHeight: "1.6",
      }}
    >
      <h1>📚 클래스 플래너 사용 매뉴얼</h1>

      <section style={{ marginBottom: "32px" }}>
        <h2>🎯 주요 기능</h2>
        <ul>
          <li>
            <strong>학생 관리</strong>: 학생 추가, 삭제, 편집
          </li>
          <li>
            <strong>과목 관리</strong>: 과목 추가, 삭제, 색상 설정
          </li>
          <li>
            <strong>시간표 관리</strong>: 드래그 앤 드롭으로 수업 추가
          </li>
          <li>
            <strong>데이터 동기화</strong>: 로컬과 클라우드 데이터 동기화
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>👥 학생 관리</h2>
        <ol>
          <li>학생 페이지에서 학생 이름과 성별을 입력</li>
          <li>Enter 키를 누르거나 추가 버튼을 클릭</li>
          <li>학생 목록에서 선택하여 편집 또는 삭제</li>
        </ol>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>📚 과목 관리</h2>
        <ol>
          <li>과목 페이지에서 과목 이름과 색상을 설정</li>
          <li>색상은 시간표에서 구분하기 위해 사용</li>
          <li>기본 과목들이 자동으로 생성됩니다</li>
        </ol>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>📅 시간표 관리</h2>
        <ol>
          <li>시간표 페이지에서 드래그 앤 드롭으로 수업 추가</li>
          <li>수업을 클릭하여 편집 또는 삭제</li>
          <li>여러 학생을 한 번에 수업에 추가 가능</li>
          <li>PDF로 시간표 내보내기 가능</li>
        </ol>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>☁️ 데이터 동기화</h2>
        <ol>
          <li>Google 또는 Kakao 계정으로 로그인</li>
          <li>로컬 데이터와 클라우드 데이터 충돌 시 선택</li>
          <li>데이터는 자동으로 백업됩니다</li>
        </ol>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>💡 팁</h2>
        <ul>
          <li>Enter 키를 사용하여 빠른 입력</li>
          <li>검색 기능으로 학생/과목 빠르게 찾기</li>
          <li>다크 모드 지원</li>
          <li>반응형 디자인으로 모바일에서도 사용 가능</li>
        </ul>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>🆘 문제 해결</h2>
        <ul>
          <li>
            <strong>데이터가 사라진 경우</strong>: 로그인하여 클라우드에서 복원
          </li>
          <li>
            <strong>시간표가 표시되지 않는 경우</strong>: 브라우저 새로고침
          </li>
          <li>
            <strong>로그인이 안 되는 경우</strong>: 네트워크 연결 확인
          </li>
        </ul>
      </section>

      <footer
        style={{
          marginTop: "48px",
          paddingTop: "16px",
          borderTop: "1px solid #eee",
          textAlign: "center",
          color: "#666",
        }}
      >
        <p>클래스 플래너 v1.0 - 교육을 더 쉽게 만들어갑니다</p>
      </footer>
    </div>
  );
};

export { ManualPageLayout };
export default ManualPageLayout;
