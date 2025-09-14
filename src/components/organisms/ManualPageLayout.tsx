import React, { useState } from "react";

const ManualPageLayout: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  return (
    <div
      data-testid="manual-page"
      className="manual-page"
      style={{
        padding: "32px",
        maxWidth: "1000px",
        margin: "0 auto",
        lineHeight: "1.6",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "16px" }}>
          📚 클래스 플래너 소개
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#666" }}>
          교육을 더 쉽게 만들어가는 현대적인 시간표 관리 도구
        </p>
      </div>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ color: "var(--color-text-primary)" }}>🎯 주요 기능</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px",
            marginTop: "24px",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              padding: "20px",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={() => setSelectedFeature("student")}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div style={{ fontSize: "2rem", marginRight: "12px" }}>👥</div>
              <h3
                style={{
                  fontSize: "1.3rem",
                  margin: 0,
                  color: "var(--color-text-primary)",
                }}
              >
                학생 관리
              </h3>
            </div>
            <p
              style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}
            >
              학생 정보를 체계적으로 관리하고 그룹별로 구성할 수 있습니다.
              실시간 검색 기능으로 빠르게 찾을 수 있습니다.
            </p>
          </div>
          <div
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              padding: "20px",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={() => setSelectedFeature("subject")}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div style={{ fontSize: "2rem", marginRight: "12px" }}>📚</div>
              <h3
                style={{
                  fontSize: "1.3rem",
                  margin: 0,
                  color: "var(--color-text-primary)",
                }}
              >
                과목 관리
              </h3>
            </div>
            <p
              style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}
            >
              과목별 색상 설정과 함께 직관적인 과목 관리 시스템을 제공합니다.
              기본 과목들이 자동으로 생성됩니다.
            </p>
          </div>
          <div
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              padding: "20px",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={() => setSelectedFeature("schedule")}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div style={{ fontSize: "2rem", marginRight: "12px" }}>📅</div>
              <h3
                style={{
                  fontSize: "1.3rem",
                  margin: 0,
                  color: "var(--color-text-primary)",
                }}
              >
                시간표 관리
              </h3>
            </div>
            <p
              style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}
            >
              드래그 앤 드롭으로 간편하게 시간표를 구성하고 관리할 수 있습니다.
              충돌 자동 해결 기능을 제공합니다.
            </p>
          </div>
          <div
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              padding: "20px",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={() => setSelectedFeature("sync")}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div style={{ fontSize: "2rem", marginRight: "12px" }}>☁️</div>
              <h3
                style={{
                  fontSize: "1.3rem",
                  margin: 0,
                  color: "var(--color-text-primary)",
                }}
              >
                데이터 동기화
              </h3>
            </div>
            <p
              style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}
            >
              소셜 로그인과 스마트 동기화로 여러 기기에서 동일한 데이터에 접근할
              수 있습니다. 사용자 선택 기반의 안전한 데이터 관리.
            </p>
          </div>
        </div>
      </section>

      {/* 상세 설명 섹션 */}
      {selectedFeature && (
        <section
          style={{
            marginBottom: "32px",
            backgroundColor: "#f0f8ff",
            padding: "24px",
            borderRadius: "12px",
            border: "2px solid #e3f2fd",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              marginBottom: "16px",
              color: "#1976d2",
            }}
          >
            {selectedFeature === "student" && "👥 학생 관리 상세"}
            {selectedFeature === "subject" && "📚 과목 관리 상세"}
            {selectedFeature === "schedule" && "📅 시간표 관리 상세"}
            {selectedFeature === "sync" && "☁️ 데이터 동기화 상세"}
          </h2>

          {selectedFeature === "student" && (
            <ol style={{ fontSize: "1rem", lineHeight: "1.6" }}>
              <li>학생 페이지에서 학생 이름과 성별을 입력</li>
              <li>Enter 키를 누르거나 추가 버튼을 클릭</li>
              <li>학생 목록에서 선택하여 편집 또는 삭제</li>
              <li>실시간 검색 기능으로 학생 빠르게 찾기</li>
              <li>학생별 그룹 구성 및 관리</li>
            </ol>
          )}

          {selectedFeature === "subject" && (
            <ol style={{ fontSize: "1rem", lineHeight: "1.6" }}>
              <li>과목 페이지에서 과목 이름과 색상을 설정</li>
              <li>색상은 시간표에서 구분하기 위해 사용</li>
              <li>기본 과목들이 자동으로 생성됩니다</li>
              <li>과목별 색상 커스터마이징</li>
              <li>과목 편집 및 삭제 기능</li>
            </ol>
          )}

          {selectedFeature === "schedule" && (
            <ol style={{ fontSize: "1rem", lineHeight: "1.6" }}>
              <li>
                <strong>드래그 앤 드롭</strong>: 시간표 페이지에서 세션을
                드래그하여 원하는 시간대에 드롭
              </li>
              <li>
                <strong>충돌 자동 해결</strong>: 세션을 겹치는 시간대에 드롭하면
                자동으로 충돌하는 세션들이 아래로 이동
              </li>
              <li>
                <strong>세션 편집</strong>: 세션을 클릭하여 시간, 과목, 학생
                변경
              </li>
              <li>
                <strong>다중 학생 수업</strong>: 여러 학생을 한 번에 수업에 추가
                가능
              </li>
              <li>
                <strong>PDF 내보내기</strong>: 완성된 시간표를 PDF로 다운로드
              </li>
              <li>
                <strong>학생별 필터링</strong>: 특정 학생의 시간표만 표시
              </li>
            </ol>
          )}

          {selectedFeature === "sync" && (
            <ol style={{ fontSize: "1rem", lineHeight: "1.6" }}>
              <li>
                <strong>소셜 로그인</strong>: Google 또는 Kakao 계정으로 간편
                로그인
              </li>
              <li>
                <strong>스마트 동기화</strong>: 로컬 데이터와 클라우드 데이터
                충돌 시 사용자가 선택
              </li>
              <li>
                <strong>자동 백업</strong>: 모든 데이터는 클라우드에 자동으로
                백업
              </li>
              <li>
                <strong>실시간 동기화</strong>: 여러 기기에서 동일한 데이터 접근
                가능
              </li>
              <li>
                <strong>데이터 보호</strong>: 사용자 선택 후에만 로컬 데이터
                삭제
              </li>
            </ol>
          )}

          <button
            onClick={() => setSelectedFeature(null)}
            style={{
              marginTop: "16px",
              padding: "8px 16px",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            닫기
          </button>
        </section>
      )}

      {/* 사용 팁 섹션 */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ color: "var(--color-text-primary)" }}>💡 사용 팁</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px",
            marginTop: "24px",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              padding: "20px",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div style={{ fontSize: "2rem", marginRight: "12px" }}>⚡</div>
              <h3
                style={{
                  fontSize: "1.3rem",
                  margin: 0,
                  color: "var(--color-text-primary)",
                }}
              >
                빠른 입력
              </h3>
            </div>
            <p
              style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}
            >
              Enter 키를 사용하여 학생/과목 빠르게 추가할 수 있습니다.
            </p>
          </div>
          <div
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              padding: "20px",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div style={{ fontSize: "2rem", marginRight: "12px" }}>🔍</div>
              <h3
                style={{
                  fontSize: "1.3rem",
                  margin: 0,
                  color: "var(--color-text-primary)",
                }}
              >
                실시간 검색
              </h3>
            </div>
            <p
              style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}
            >
              입력창에서 실시간으로 학생/과목을 검색할 수 있습니다.
            </p>
          </div>
          <div
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              padding: "20px",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div style={{ fontSize: "2rem", marginRight: "12px" }}>🌙</div>
              <h3
                style={{
                  fontSize: "1.3rem",
                  margin: 0,
                  color: "var(--color-text-primary)",
                }}
              >
                다크 모드
              </h3>
            </div>
            <p
              style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}
            >
              우측 상단 토글 버튼으로 테마를 변경할 수 있습니다.
            </p>
          </div>
          <div
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              padding: "20px",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div style={{ fontSize: "2rem", marginRight: "12px" }}>📱</div>
              <h3
                style={{
                  fontSize: "1.3rem",
                  margin: 0,
                  color: "var(--color-text-primary)",
                }}
              >
                반응형 디자인
              </h3>
            </div>
            <p
              style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}
            >
              모바일, 태블릿, 데스크톱 모든 기기에서 최적화되어 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* 저작권 정보 섹션 */}
      <section
        style={{
          marginBottom: "32px",
          backgroundColor: "var(--color-bg-secondary)",
          padding: "24px",
          borderRadius: "12px",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            marginBottom: "16px",
            color: "var(--color-text-primary)",
          }}
        >
          📄 저작권 및 라이선스
        </h2>
        <div
          style={{
            fontSize: "0.9rem",
            color: "var(--color-text-muted)",
            lineHeight: "1.6",
          }}
        >
          <p style={{ marginBottom: "8px" }}>
            <strong>저작권:</strong> © 2024 클래스 플래너. 모든 권리 보유.
          </p>
          <p style={{ marginBottom: "8px" }}>
            <strong>라이선스:</strong> 이 소프트웨어는 교육 목적으로
            제작되었으며, 개인 및 교육 기관에서 자유롭게 사용할 수 있습니다.
          </p>
          <p>
            <strong>개발자:</strong> 교육의 디지털화를 통해 더 나은 학습 환경을
            만들고자 하는 개발팀
          </p>
        </div>
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
