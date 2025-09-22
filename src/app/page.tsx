"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 로그인 상태 확인
  useEffect(() => {
    const checkLoginStatus = () => {
      const userId = localStorage.getItem("supabase_user_id");
      setIsLoggedIn(!!userId);
    };

    checkLoginStatus();

    // 로그인 상태 변화 감지
    const handleAuthChange = () => {
      checkLoginStatus();
    };

    // 로그아웃 이벤트 감지
    window.addEventListener("userLoggedOut", handleAuthChange);

    // 주기적으로 상태 확인 (로그인 시)
    const interval = setInterval(checkLoginStatus, 1000);

    return () => {
      window.removeEventListener("userLoggedOut", handleAuthChange);
      clearInterval(interval);
    };
  }, []);

  return <HomeContent isLoggedIn={isLoggedIn} />;
}

function HomeContent({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div
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
            클래스 플래너
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
            효율적인 수업 관리와 시간표 작성 도구
          </p>

          {!isLoggedIn && (
            <div
              className="mb-12"
              style={{
                marginBottom: "48px",
              }}
            >
              <p
                className="text-lg mb-6"
                style={{
                  fontSize: "1.125rem",
                  color: "rgba(255, 255, 255, 0.8)",
                  margin: "0 0 24px 0",
                }}
              >
                시작하려면 로그인해주세요
              </p>
              <Link
                href="/login"
                className="inline-block px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: "white",
                  color: "#667eea",
                  padding: "16px 32px",
                  borderRadius: "12px",
                  textDecoration: "none",
                  boxShadow: "0 8px 25px rgba(0, 0, 0, 0.2)",
                  fontWeight: "600",
                }}
              >
                로그인하기
              </Link>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "32px",
          }}
        >
          <Link
            href="/students"
            className="group"
            style={{
              textDecoration: "none",
            }}
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
                학생 정보를 추가하고 관리하세요
              </p>
            </div>
          </Link>

          <Link
            href="/subjects"
            className="group"
            style={{
              textDecoration: "none",
            }}
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
                과목을 추가하고 색상을 설정하세요
              </p>
            </div>
          </Link>

          <Link
            href="/schedule"
            className="group"
            style={{
              textDecoration: "none",
            }}
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
                시간표
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
                드래그 앤 드롭으로 수업을 배치하세요
              </p>
            </div>
          </Link>

          <Link
            href="/about"
            className="group"
            style={{
              textDecoration: "none",
            }}
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
                📖
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
                소개
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
                클래스 플래너에 대해 자세히 알아보세요
              </p>
            </div>
          </Link>
        </div>

        {/* Additional Info for Logged In Users */}
        {isLoggedIn && (
          <div
            className="mt-16 text-center"
            style={{
              marginTop: "64px",
              textAlign: "center",
            }}
          >
            <p
              className="text-lg"
              style={{
                fontSize: "1.125rem",
                color: "rgba(255, 255, 255, 0.8)",
                margin: "0",
              }}
            >
              로그인하신 것을 환영합니다! 위의 기능들을 자유롭게 사용해보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
