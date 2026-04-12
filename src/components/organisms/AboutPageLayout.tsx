import React, { useState } from "react";
import FeatureCard from "./about/FeatureCard";
import FeatureDetail from "./about/FeatureDetail";
import HeroSection from "./about/HeroSection";

const FEATURES = [
  {
    featureKey: "student",
    emoji: "👥",
    title: "학생 관리",
    description:
      "학생 정보를 체계적으로 관리하고 그룹별로 구성할 수 있습니다. 실시간 검색 기능으로 빠르게 찾을 수 있습니다.",
  },
  {
    featureKey: "subject",
    emoji: "📚",
    title: "과목 관리",
    description:
      "과목별 색상 설정과 함께 직관적인 과목 관리 시스템을 제공합니다. 기본 과목들이 자동으로 생성됩니다.",
  },
  {
    featureKey: "schedule",
    emoji: "📅",
    title: "시간표 관리",
    description:
      "드래그 앤 드롭으로 간편하게 시간표를 구성하고 관리할 수 있습니다. 충돌 자동 해결 기능을 제공합니다.",
  },
  {
    featureKey: "sync",
    emoji: "☁️",
    title: "데이터 동기화",
    description:
      "Google 로그인과 스마트 동기화로 여러 기기에서 동일한 데이터에 접근할 수 있습니다.",
  },
] as const;

const AboutPageLayout: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  return (
    <div
      data-testid="about-page"
      className="min-h-screen py-10 px-5"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
    >
      <div className="max-w-6xl mx-auto">
        <HeroSection />

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {FEATURES.map((f) => (
            <FeatureCard key={f.featureKey} {...f} onSelect={setSelectedFeature} />
          ))}
        </div>

        {/* Feature Detail */}
        {selectedFeature && (
          <FeatureDetail
            selectedFeature={selectedFeature}
            onClose={() => setSelectedFeature(null)}
          />
        )}

        {/* 사용 팁 섹션 */}
        <div className="bg-white rounded-2xl p-8 shadow-xl mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
            💡 사용 팁
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">
                빠른 입력
              </h3>
              <p className="text-gray-600 text-sm">
                Enter 키를 사용하여 학생/과목을 빠르게 추가할 수 있습니다.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">
                실시간 검색
              </h3>
              <p className="text-gray-600 text-sm">
                입력창에서 실시간으로 학생/과목을 검색할 수 있습니다.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🌙</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">
                다크 모드
              </h3>
              <p className="text-gray-600 text-sm">
                로그인 후 우측 상단 토글 버튼으로 테마를 변경할 수 있습니다.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">
                반응형 디자인
              </h3>
              <p className="text-gray-600 text-sm">
                모바일, 태블릿, 데스크톱 모든 기기에서 최적화되어 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 저작권 정보 섹션 */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
            📄 저작권 및 라이선스
          </h2>
          <div className="text-gray-600 text-center leading-relaxed text-sm">
            <p className="mb-3">
              <strong>저작권:</strong> © 2024 클래스 플래너. 모든 권리 보유.
            </p>
            <p className="mb-3">
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
