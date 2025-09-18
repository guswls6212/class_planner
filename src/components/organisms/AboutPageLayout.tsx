import React, { useState } from "react";

const AboutPageLayout: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  return (
    <div
      data-testid="about-page"
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "calc(100vh - 120px)", // nav + footer 높이 제외
        padding: "40px 20px",
      }}
    >
      <div
        className="max-w-6xl mx-auto"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Hero Section */}
        <div
          className="text-center mb-16"
          style={{
            marginBottom: "64px",
          }}
        >
          <h1
            className="text-6xl font-bold mb-6"
            style={{
              fontSize: "3.5rem",
              fontWeight: "700",
              color: "white",
              margin: "0 0 24px 0",
              textShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
            }}
          >
            📚 클래스 플래너 소개
          </h1>
          <p
            className="text-2xl mb-8"
            style={{
              fontSize: "1.5rem",
              color: "rgba(255, 255, 255, 0.9)",
              margin: "0 0 32px 0",
              fontWeight: "300",
            }}
          >
            교육을 더 쉽게 만들어가는 현대적인 시간표 관리 도구
          </p>
        </div>

        {/* Features Grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "32px",
            marginBottom: "64px",
          }}
        >
          <div
            className="group cursor-pointer"
            style={{
              textDecoration: "none",
            }}
            onClick={() => setSelectedFeature("student")}
          >
            <div
              className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                padding: "32px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
                transition: "all 0.3s ease",
              }}
            >
              <div
                className="text-5xl mb-6 text-center"
                style={{
                  fontSize: "3rem",
                  marginBottom: "24px",
                  textAlign: "center",
                }}
              >
                👥
              </div>
              <h3
                className="text-xl font-bold mb-4 text-center"
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  color: "#1f2937",
                  margin: "0 0 16px 0",
                  textAlign: "center",
                }}
              >
                학생 관리
              </h3>
              <p
                className="text-gray-600 text-center leading-relaxed"
                style={{
                  color: "#6b7280",
                  textAlign: "center",
                  lineHeight: "1.6",
                  margin: "0",
                }}
              >
                학생 정보를 체계적으로 관리하고 그룹별로 구성할 수 있습니다.
                실시간 검색 기능으로 빠르게 찾을 수 있습니다.
              </p>
            </div>
          </div>

          <div
            className="group cursor-pointer"
            style={{
              textDecoration: "none",
            }}
            onClick={() => setSelectedFeature("subject")}
          >
            <div
              className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                padding: "32px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
                transition: "all 0.3s ease",
              }}
            >
              <div
                className="text-5xl mb-6 text-center"
                style={{
                  fontSize: "3rem",
                  marginBottom: "24px",
                  textAlign: "center",
                }}
              >
                📚
              </div>
              <h3
                className="text-xl font-bold mb-4 text-center"
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  color: "#1f2937",
                  margin: "0 0 16px 0",
                  textAlign: "center",
                }}
              >
                과목 관리
              </h3>
              <p
                className="text-gray-600 text-center leading-relaxed"
                style={{
                  color: "#6b7280",
                  textAlign: "center",
                  lineHeight: "1.6",
                  margin: "0",
                }}
              >
                과목별 색상 설정과 함께 직관적인 과목 관리 시스템을 제공합니다.
                기본 과목들이 자동으로 생성됩니다.
              </p>
            </div>
          </div>

          <div
            className="group cursor-pointer"
            style={{
              textDecoration: "none",
            }}
            onClick={() => setSelectedFeature("schedule")}
          >
            <div
              className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                padding: "32px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
                transition: "all 0.3s ease",
              }}
            >
              <div
                className="text-5xl mb-6 text-center"
                style={{
                  fontSize: "3rem",
                  marginBottom: "24px",
                  textAlign: "center",
                }}
              >
                📅
              </div>
              <h3
                className="text-xl font-bold mb-4 text-center"
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  color: "#1f2937",
                  margin: "0 0 16px 0",
                  textAlign: "center",
                }}
              >
                시간표 관리
              </h3>
              <p
                className="text-gray-600 text-center leading-relaxed"
                style={{
                  color: "#6b7280",
                  textAlign: "center",
                  lineHeight: "1.6",
                  margin: "0",
                }}
              >
                드래그 앤 드롭으로 간편하게 시간표를 구성하고 관리할 수
                있습니다. 충돌 자동 해결 기능을 제공합니다.
              </p>
            </div>
          </div>

          <div
            className="group cursor-pointer"
            style={{
              textDecoration: "none",
            }}
            onClick={() => setSelectedFeature("sync")}
          >
            <div
              className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                padding: "32px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
                transition: "all 0.3s ease",
              }}
            >
              <div
                className="text-5xl mb-6 text-center"
                style={{
                  fontSize: "3rem",
                  marginBottom: "24px",
                  textAlign: "center",
                }}
              >
                ☁️
              </div>
              <h3
                className="text-xl font-bold mb-4 text-center"
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  color: "#1f2937",
                  margin: "0 0 16px 0",
                  textAlign: "center",
                }}
              >
                데이터 동기화
              </h3>
              <p
                className="text-gray-600 text-center leading-relaxed"
                style={{
                  color: "#6b7280",
                  textAlign: "center",
                  lineHeight: "1.6",
                  margin: "0",
                }}
              >
                Google 로그인과 스마트 동기화로 여러 기기에서 동일한 데이터에
                접근할 수 있습니다. 사용자 선택 기반의 안전한 데이터 관리.
              </p>
            </div>
          </div>
        </div>

        {/* 상세 설명 섹션 */}
        {selectedFeature && (
          <div
            className="bg-white rounded-2xl p-6 shadow-xl mb-6"
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
              marginBottom: "24px",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div
                  className="text-3xl mr-3"
                  style={{
                    fontSize: "2rem",
                    marginRight: "12px",
                  }}
                >
                  {selectedFeature === "student" && "👥"}
                  {selectedFeature === "subject" && "📚"}
                  {selectedFeature === "schedule" && "📅"}
                  {selectedFeature === "sync" && "☁️"}
                </div>
                <h2
                  className="text-xl font-bold"
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "700",
                    color: "#1f2937",
                    margin: "0",
                  }}
                >
                  {selectedFeature === "student" && "학생 관리 상세"}
                  {selectedFeature === "subject" && "과목 관리 상세"}
                  {selectedFeature === "schedule" && "시간표 관리 상세"}
                  {selectedFeature === "sync" && "데이터 동기화 상세"}
                </h2>
              </div>
              <button
                onClick={() => setSelectedFeature(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                ×
              </button>
            </div>

            <div
              className="text-gray-600 leading-relaxed"
              style={{
                color: "#6b7280",
                lineHeight: "1.6",
                fontSize: "1rem",
              }}
            >
              {selectedFeature === "student" && (
                <div
                  className="grid gap-3"
                  style={{
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  <div
                    className="flex items-start p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#eff6ff",
                      borderRadius: "8px",
                      borderLeft: "4px solid #60a5fa",
                    }}
                  >
                    <div
                      className="text-blue-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#3b82f6",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      1
                    </div>
                    <p
                      className="text-gray-700 text-sm"
                      style={{
                        color: "#374151",
                        fontSize: "0.875rem",
                        margin: "0",
                      }}
                    >
                      학생 페이지에서 학생 이름을 입력하여 추가
                    </p>
                  </div>
                  <div
                    className="flex items-start p-3 bg-green-50 rounded-lg border-l-4 border-green-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#f0fdf4",
                      borderRadius: "8px",
                      borderLeft: "4px solid #4ade80",
                    }}
                  >
                    <div
                      className="text-green-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#22c55e",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      2
                    </div>
                    <p
                      className="text-gray-700 text-sm"
                      style={{
                        color: "#374151",
                        fontSize: "0.875rem",
                        margin: "0",
                      }}
                    >
                      Enter 키를 누르거나 추가 버튼을 클릭
                    </p>
                  </div>
                  <div
                    className="flex items-start p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#faf5ff",
                      borderRadius: "8px",
                      borderLeft: "4px solid #a78bfa",
                    }}
                  >
                    <div
                      className="text-purple-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#8b5cf6",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      3
                    </div>
                    <p
                      className="text-gray-700 text-sm"
                      style={{
                        color: "#374151",
                        fontSize: "0.875rem",
                        margin: "0",
                      }}
                    >
                      학생 목록에서 선택하여 편집 또는 삭제
                    </p>
                  </div>
                  <div
                    className="flex items-start p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#fff7ed",
                      borderRadius: "8px",
                      borderLeft: "4px solid #fb923c",
                    }}
                  >
                    <div
                      className="text-orange-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#f97316",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      4
                    </div>
                    <p
                      className="text-gray-700 text-sm"
                      style={{
                        color: "#374151",
                        fontSize: "0.875rem",
                        margin: "0",
                      }}
                    >
                      실시간 검색 기능으로 학생 빠르게 찾기
                    </p>
                  </div>
                  <div
                    className="flex items-start p-3 bg-pink-50 rounded-lg border-l-4 border-pink-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#fdf2f8",
                      borderRadius: "8px",
                      borderLeft: "4px solid #f472b6",
                    }}
                  >
                    <div
                      className="text-pink-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#ec4899",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      5
                    </div>
                    <p
                      className="text-gray-700 text-sm"
                      style={{
                        color: "#374151",
                        fontSize: "0.875rem",
                        margin: "0",
                      }}
                    >
                      학생별 그룹 구성 및 관리
                    </p>
                  </div>
                </div>
              )}

              {selectedFeature === "subject" && (
                <div
                  className="grid gap-3"
                  style={{
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  <div
                    className="flex items-start p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#eff6ff",
                      borderRadius: "8px",
                      borderLeft: "4px solid #60a5fa",
                    }}
                  >
                    <div
                      className="text-blue-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#3b82f6",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      1
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        과목 추가 및 설정
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        과목 페이지에서 과목 이름과 색상을 설정
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start p-3 bg-green-50 rounded-lg border-l-4 border-green-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#f0fdf4",
                      borderRadius: "8px",
                      borderLeft: "4px solid #4ade80",
                    }}
                  >
                    <div
                      className="text-green-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#22c55e",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      2
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        색상 구분 시스템
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        색상은 시간표에서 과목을 구분하기 위해 사용
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#faf5ff",
                      borderRadius: "8px",
                      borderLeft: "4px solid #a78bfa",
                    }}
                  >
                    <div
                      className="text-purple-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#8b5cf6",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      3
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        기본 과목 자동 생성
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        초등수학, 중등수학, 중등영어, 중등국어, 중등과학,
                        중등사회, 고등수학, 고등영어, 고등국어
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#fff7ed",
                      borderRadius: "8px",
                      borderLeft: "4px solid #fb923c",
                    }}
                  >
                    <div
                      className="text-orange-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#f97316",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      4
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        색상 커스터마이징
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        과목별 색상을 자유롭게 변경하여 개인화
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start p-3 bg-pink-50 rounded-lg border-l-4 border-pink-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#fdf2f8",
                      borderRadius: "8px",
                      borderLeft: "4px solid #f472b6",
                    }}
                  >
                    <div
                      className="text-pink-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#ec4899",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      5
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        편집 및 삭제
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        과목 정보 수정 및 불필요한 과목 삭제
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedFeature === "schedule" && (
                <div
                  className="grid gap-3"
                  style={{
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  <div
                    className="flex items-start p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#eff6ff",
                      borderRadius: "8px",
                      borderLeft: "4px solid #60a5fa",
                    }}
                  >
                    <div
                      className="text-blue-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#3b82f6",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      1
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        드래그 앤 드롭
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        시간표 페이지에서 세션을 드래그하여 원하는 시간대에 드롭
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start p-3 bg-green-50 rounded-lg border-l-4 border-green-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#f0fdf4",
                      borderRadius: "8px",
                      borderLeft: "4px solid #4ade80",
                    }}
                  >
                    <div
                      className="text-green-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#22c55e",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      2
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        충돌 자동 해결
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        세션을 겹치는 시간대에 드롭하면 자동으로 충돌하는
                        세션들이 아래로 이동
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#faf5ff",
                      borderRadius: "8px",
                      borderLeft: "4px solid #a78bfa",
                    }}
                  >
                    <div
                      className="text-purple-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#8b5cf6",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      3
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        세션 편집
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        세션을 클릭하여 시간, 과목, 학생 변경
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#fff7ed",
                      borderRadius: "8px",
                      borderLeft: "4px solid #fb923c",
                    }}
                  >
                    <div
                      className="text-orange-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#f97316",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      4
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        다중 학생 수업
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        여러 학생을 한 번에 수업에 추가 가능
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start p-3 bg-pink-50 rounded-lg border-l-4 border-pink-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#fdf2f8",
                      borderRadius: "8px",
                      borderLeft: "4px solid #f472b6",
                    }}
                  >
                    <div
                      className="text-pink-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#ec4899",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      5
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        PDF 내보내기
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        완성된 시간표를 PDF로 다운로드
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#eef2ff",
                      borderRadius: "8px",
                      borderLeft: "4px solid #818cf8",
                    }}
                  >
                    <div
                      className="text-indigo-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#6366f1",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      6
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        학생별 필터링
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        특정 학생의 시간표만 표시
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start p-3 bg-teal-50 rounded-lg border-l-4 border-teal-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#f0fdfa",
                      borderRadius: "8px",
                      borderLeft: "4px solid #2dd4bf",
                    }}
                  >
                    <div
                      className="text-teal-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#14b8a6",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      7
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        학생 드래그로 수업 추가
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        학생을 드래그하여 시간표에 직접 수업 추가
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedFeature === "sync" && (
                <div
                  className="grid gap-3"
                  style={{
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  <div
                    className="flex items-start p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#eff6ff",
                      borderRadius: "8px",
                      borderLeft: "4px solid #60a5fa",
                    }}
                  >
                    <div
                      className="text-blue-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#3b82f6",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      1
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        Google 로그인
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        Google 계정으로 간편하고 안전한 로그인
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start p-3 bg-green-50 rounded-lg border-l-4 border-green-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#f0fdf4",
                      borderRadius: "8px",
                      borderLeft: "4px solid #4ade80",
                    }}
                  >
                    <div
                      className="text-green-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#22c55e",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      2
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        스마트 동기화
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        로컬 데이터와 클라우드 데이터 충돌 시 사용자가 선택
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#faf5ff",
                      borderRadius: "8px",
                      borderLeft: "4px solid #a78bfa",
                    }}
                  >
                    <div
                      className="text-purple-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#8b5cf6",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      3
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        자동 백업
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        모든 데이터는 클라우드에 자동으로 백업
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#fff7ed",
                      borderRadius: "8px",
                      borderLeft: "4px solid #fb923c",
                    }}
                  >
                    <div
                      className="text-orange-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#f97316",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      4
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        실시간 동기화
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        여러 기기에서 동일한 데이터에 접근 가능
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start p-3 bg-pink-50 rounded-lg border-l-4 border-pink-400"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px",
                      backgroundColor: "#fdf2f8",
                      borderRadius: "8px",
                      borderLeft: "4px solid #f472b6",
                    }}
                  >
                    <div
                      className="text-pink-500 mr-3 mt-0.5 font-bold"
                      style={{
                        color: "#ec4899",
                        marginRight: "12px",
                        marginTop: "2px",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      5
                    </div>
                    <div>
                      <p
                        className="text-gray-700 text-sm font-semibold mb-1"
                        style={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          margin: "0 0 4px 0",
                        }}
                      >
                        데이터 보호
                      </p>
                      <p
                        className="text-gray-600 text-xs"
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          margin: "0",
                        }}
                      >
                        사용자 선택 후에만 로컬 데이터 삭제
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 사용 팁 섹션 */}
        <div
          className="bg-white rounded-2xl p-8 shadow-xl mb-8"
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
            marginBottom: "32px",
          }}
        >
          <h2
            className="text-2xl font-bold mb-6 text-center"
            style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              color: "#1f2937",
              margin: "0 0 24px 0",
              textAlign: "center",
            }}
          >
            💡 사용 팁
          </h2>
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "24px",
            }}
          >
            <div
              className="text-center"
              style={{
                textAlign: "center",
              }}
            >
              <div
                className="text-4xl mb-4"
                style={{
                  fontSize: "2.5rem",
                  marginBottom: "16px",
                }}
              >
                ⚡
              </div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  color: "#1f2937",
                  margin: "0 0 8px 0",
                }}
              >
                빠른 입력
              </h3>
              <p
                className="text-gray-600 text-sm"
                style={{
                  color: "#6b7280",
                  fontSize: "0.875rem",
                  margin: "0",
                }}
              >
                Enter 키를 사용하여 학생/과목을 빠르게 추가할 수 있습니다.
              </p>
            </div>
            <div
              className="text-center"
              style={{
                textAlign: "center",
              }}
            >
              <div
                className="text-4xl mb-4"
                style={{
                  fontSize: "2.5rem",
                  marginBottom: "16px",
                }}
              >
                🔍
              </div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  color: "#1f2937",
                  margin: "0 0 8px 0",
                }}
              >
                실시간 검색
              </h3>
              <p
                className="text-gray-600 text-sm"
                style={{
                  color: "#6b7280",
                  fontSize: "0.875rem",
                  margin: "0",
                }}
              >
                입력창에서 실시간으로 학생/과목을 검색할 수 있습니다.
              </p>
            </div>
            <div
              className="text-center"
              style={{
                textAlign: "center",
              }}
            >
              <div
                className="text-4xl mb-4"
                style={{
                  fontSize: "2.5rem",
                  marginBottom: "16px",
                }}
              >
                🌙
              </div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  color: "#1f2937",
                  margin: "0 0 8px 0",
                }}
              >
                다크 모드
              </h3>
              <p
                className="text-gray-600 text-sm"
                style={{
                  color: "#6b7280",
                  fontSize: "0.875rem",
                  margin: "0",
                }}
              >
                로그인 후 우측 상단 토글 버튼으로 테마를 변경할 수 있습니다.
              </p>
            </div>
            <div
              className="text-center"
              style={{
                textAlign: "center",
              }}
            >
              <div
                className="text-4xl mb-4"
                style={{
                  fontSize: "2.5rem",
                  marginBottom: "16px",
                }}
              >
                📱
              </div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  color: "#1f2937",
                  margin: "0 0 8px 0",
                }}
              >
                반응형 디자인
              </h3>
              <p
                className="text-gray-600 text-sm"
                style={{
                  color: "#6b7280",
                  fontSize: "0.875rem",
                  margin: "0",
                }}
              >
                모바일, 태블릿, 데스크톱 모든 기기에서 최적화되어 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 저작권 정보 섹션 */}
        <div
          className="bg-white rounded-2xl p-8 shadow-xl"
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h2
            className="text-2xl font-bold mb-6 text-center"
            style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              color: "#1f2937",
              margin: "0 0 24px 0",
              textAlign: "center",
            }}
          >
            📄 저작권 및 라이선스
          </h2>
          <div
            className="text-gray-600 text-center leading-relaxed"
            style={{
              color: "#6b7280",
              textAlign: "center",
              lineHeight: "1.6",
              fontSize: "0.9rem",
            }}
          >
            <p style={{ marginBottom: "12px" }}>
              <strong>저작권:</strong> © 2024 클래스 플래너. 모든 권리 보유.
            </p>
            <p style={{ marginBottom: "12px" }}>
              <strong>라이선스:</strong> 이 소프트웨어는 교육 목적으로
              제작되었으며, 개인 및 교육 기관에서 자유롭게 사용할 수 있습니다.
            </p>
            <p>
              <strong>문의사항:</strong> contact@info365.studio
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AboutPageLayout };
export default AboutPageLayout;
