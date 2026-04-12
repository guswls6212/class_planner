import React from "react";

interface FeatureDetailProps {
  selectedFeature: string;
  onClose: () => void;
}

const FeatureDetail: React.FC<FeatureDetailProps> = ({
  selectedFeature,
  onClose,
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="text-3xl mr-3">
            {selectedFeature === "student" && "👥"}
            {selectedFeature === "subject" && "📚"}
            {selectedFeature === "schedule" && "📅"}
            {selectedFeature === "sync" && "☁️"}
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {selectedFeature === "student" && "학생 관리 상세"}
            {selectedFeature === "subject" && "과목 관리 상세"}
            {selectedFeature === "schedule" && "시간표 관리 상세"}
            {selectedFeature === "sync" && "데이터 동기화 상세"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200 w-8 h-8 flex items-center justify-center rounded"
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      <div className="text-gray-600 leading-relaxed">
        {selectedFeature === "student" && (
          <div className="grid gap-3">
            <div className="flex items-start p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="text-blue-500 mr-3 mt-0.5 font-bold text-sm">
                1
              </div>
              <p className="text-gray-700 text-sm">
                학생 페이지에서 학생 이름을 입력하여 추가
              </p>
            </div>
            <div className="flex items-start p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
              <div className="text-green-500 mr-3 mt-0.5 font-bold text-sm">
                2
              </div>
              <p className="text-gray-700 text-sm">
                Enter 키를 누르거나 추가 버튼을 클릭
              </p>
            </div>
            <div className="flex items-start p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
              <div className="text-purple-500 mr-3 mt-0.5 font-bold text-sm">
                3
              </div>
              <p className="text-gray-700 text-sm">
                학생 목록에서 선택하여 편집 또는 삭제
              </p>
            </div>
            <div className="flex items-start p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
              <div className="text-orange-500 mr-3 mt-0.5 font-bold text-sm">
                4
              </div>
              <p className="text-gray-700 text-sm">
                실시간 검색 기능으로 학생 빠르게 찾기
              </p>
            </div>
            <div className="flex items-start p-3 bg-pink-50 rounded-lg border-l-4 border-pink-400">
              <div className="text-pink-500 mr-3 mt-0.5 font-bold text-sm">
                5
              </div>
              <p className="text-gray-700 text-sm">
                학생별 그룹 구성 및 관리
              </p>
            </div>
          </div>
        )}

        {selectedFeature === "subject" && (
          <div className="grid gap-3">
            <div className="flex items-start p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="text-blue-500 mr-3 mt-0.5 font-bold text-sm">
                1
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  과목 추가 및 설정
                </p>
                <p className="text-gray-600 text-xs">
                  과목 페이지에서 과목 이름과 색상을 설정
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
              <div className="text-green-500 mr-3 mt-0.5 font-bold text-sm">
                2
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  색상 구분 시스템
                </p>
                <p className="text-gray-600 text-xs">
                  색상은 시간표에서 과목을 구분하기 위해 사용
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
              <div className="text-purple-500 mr-3 mt-0.5 font-bold text-sm">
                3
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  기본 과목 자동 생성
                </p>
                <p className="text-gray-600 text-xs">
                  초등수학, 중등수학, 중등영어, 중등국어, 중등과학,
                  중등사회, 고등수학, 고등영어, 고등국어
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
              <div className="text-orange-500 mr-3 mt-0.5 font-bold text-sm">
                4
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  색상 커스터마이징
                </p>
                <p className="text-gray-600 text-xs">
                  과목별 색상을 자유롭게 변경하여 개인화
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-pink-50 rounded-lg border-l-4 border-pink-400">
              <div className="text-pink-500 mr-3 mt-0.5 font-bold text-sm">
                5
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  편집 및 삭제
                </p>
                <p className="text-gray-600 text-xs">
                  과목 정보 수정 및 불필요한 과목 삭제
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedFeature === "schedule" && (
          <div className="grid gap-3">
            <div className="flex items-start p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="text-blue-500 mr-3 mt-0.5 font-bold text-sm">
                1
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  드래그 앤 드롭
                </p>
                <p className="text-gray-600 text-xs">
                  시간표 페이지에서 세션을 드래그하여 원하는 시간대에 드롭
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
              <div className="text-green-500 mr-3 mt-0.5 font-bold text-sm">
                2
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  충돌 자동 해결
                </p>
                <p className="text-gray-600 text-xs">
                  세션을 겹치는 시간대에 드롭하면 자동으로 충돌하는
                  세션들이 아래로 이동
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
              <div className="text-purple-500 mr-3 mt-0.5 font-bold text-sm">
                3
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  세션 편집
                </p>
                <p className="text-gray-600 text-xs">
                  세션을 클릭하여 시간, 과목, 학생 변경
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
              <div className="text-orange-500 mr-3 mt-0.5 font-bold text-sm">
                4
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  다중 학생 수업
                </p>
                <p className="text-gray-600 text-xs">
                  여러 학생을 한 번에 수업에 추가 가능
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-pink-50 rounded-lg border-l-4 border-pink-400">
              <div className="text-pink-500 mr-3 mt-0.5 font-bold text-sm">
                5
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  PDF 내보내기
                </p>
                <p className="text-gray-600 text-xs">
                  완성된 시간표를 PDF로 다운로드
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-400">
              <div className="text-indigo-500 mr-3 mt-0.5 font-bold text-sm">
                6
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  학생별 필터링
                </p>
                <p className="text-gray-600 text-xs">
                  특정 학생의 시간표만 표시
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-teal-50 rounded-lg border-l-4 border-teal-400">
              <div className="text-teal-500 mr-3 mt-0.5 font-bold text-sm">
                7
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  학생 드래그로 수업 추가
                </p>
                <p className="text-gray-600 text-xs">
                  학생을 드래그하여 시간표에 직접 수업 추가
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedFeature === "sync" && (
          <div className="grid gap-3">
            <div className="flex items-start p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="text-blue-500 mr-3 mt-0.5 font-bold text-sm">
                1
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  Google 로그인
                </p>
                <p className="text-gray-600 text-xs">
                  Google 계정으로 간편하고 안전한 로그인
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
              <div className="text-green-500 mr-3 mt-0.5 font-bold text-sm">
                2
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  스마트 동기화
                </p>
                <p className="text-gray-600 text-xs">
                  로컬 데이터와 서버 데이터를 자동으로 동기화
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
              <div className="text-purple-500 mr-3 mt-0.5 font-bold text-sm">
                3
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  자동 백업
                </p>
                <p className="text-gray-600 text-xs">
                  모든 데이터는 클라우드에 자동으로 백업
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
              <div className="text-orange-500 mr-3 mt-0.5 font-bold text-sm">
                4
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  실시간 동기화
                </p>
                <p className="text-gray-600 text-xs">
                  여러 기기에서 동일한 데이터에 접근 가능
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-pink-50 rounded-lg border-l-4 border-pink-400">
              <div className="text-pink-500 mr-3 mt-0.5 font-bold text-sm">
                5
              </div>
              <div>
                <p className="text-gray-700 text-sm font-semibold mb-1">
                  데이터 보호
                </p>
                <p className="text-gray-600 text-xs">
                  사용자별 데이터 격리 및 안전한 저장
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeatureDetail;
