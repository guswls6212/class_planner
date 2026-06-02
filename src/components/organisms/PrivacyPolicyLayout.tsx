import React from "react";

/**
 * 개인정보처리방침 — 정적 콘텐츠 organism (문서형 white 카드).
 *
 * 원칙: 최소 수집 · 익명 분석(쿠키 없음) · IP /24 마스킹 · 자체 보관 · 제3자 추적 없음.
 * 분석 항목 SSOT: dev-pack `analytics-feature-completeness` proposal (익명·집계 한정).
 *
 * ⚠️ 초안 — 배포 전 (1) 문의 이메일 확정 (2) 법무 문구 검토 권장.
 */

const CONTACT_EMAIL = "trymakeit1000@gmail.com"; // TODO: 전용 문의처 확정 시 교체
const EFFECTIVE_DATE = "2026년 6월 2일";

interface PolicySection {
  title: string;
  body: React.ReactNode;
}

const SECTIONS: PolicySection[] = [
  {
    title: "1. 익명 이용 분석 (쿠키 없음)",
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          수집 항목: 방문한 페이지 · 체류시간 · 스크롤 깊이, 기기 · 브라우저 · OS
          종류, 대략적인 접속 지역(국가 · 도시), 유입 캠페인 정보(UTM), 외부 링크 ·
          파일 다운로드 클릭, 페이지 성능 지표.
        </li>
        <li>
          식별 방식: 브라우저에 저장되는 임의의 익명 식별자(랜덤 값)만 사용하며,
          쿠키를 사용하지 않습니다. 이름 · 이메일 · 전화번호 등 개인을 식별하는
          정보는 분석 목적으로 수집하지 않습니다.
        </li>
        <li>
          IP 주소: 접속 IP는 일부를 가린 형태(/24 마스킹)로만 저장하며 화면에
          표시하지 않습니다. 정밀 위치(좌표 · 주소 · 우편번호)는 수집하지 않습니다.
        </li>
        <li>이용 목적: 서비스 개선과 통계(집계 분석)에 한정합니다.</li>
        <li>
          보관 기간: 원시 분석 기록은 90일 이후 자동 삭제하며, 그 이후에는 개인을
          식별할 수 없는 집계 통계만 보관합니다.
        </li>
      </ul>
    ),
  },
  {
    title: "2. 계정 정보 (로그인 시)",
    body: (
      <p>
        Google 또는 Kakao 계정으로 로그인하는 경우, 인증 제공자로부터 이메일 · 이름
        등 최소한의 식별 정보를 전달받아 인증과 계정 식별 목적으로만 사용합니다.
        인증과 데이터 저장은 Supabase(인증 · 데이터베이스 제공자)를 통해 처리됩니다.
      </p>
    ),
  },
  {
    title: "3. 서비스 입력 데이터",
    body: (
      <p>
        이용자(학원 · 공부방 운영자)가 입력하는 학생 · 강사 · 시간표 정보는 해당
        이용자의 계정에 귀속되어 서비스 제공 목적으로만 저장되며, 제3자에게 제공되지
        않습니다. 입력한 정보의 관리 주체는 이를 입력한 운영자입니다.
      </p>
    ),
  },
  {
    title: "4. 제3자 제공 · 광고",
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>수집한 정보를 외부에 판매하거나 제공하지 않습니다.</li>
        <li>
          광고 · 추적 픽셀이나 제3자 분석 도구를 사용하지 않으며, 분석 데이터는 자체
          서버에 보관합니다.
        </li>
      </ul>
    ),
  },
  {
    title: "5. 이용자의 권리",
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          분석 식별자는 익명이므로 개별 이용자를 특정할 수 없으나, 브라우저의 사이트
          데이터(localStorage)를 삭제하면 분석 식별자가 초기화됩니다.
        </li>
        <li>
          계정 · 서비스 데이터의 열람 또는 삭제는 아래 문의처를 통해 요청할 수
          있습니다.
        </li>
      </ul>
    ),
  },
  {
    title: "6. 방침 변경",
    body: <p>본 방침이 변경되는 경우 본 페이지를 통해 변경 내용을 안내합니다.</p>,
  },
  {
    title: "7. 문의",
    body: (
      <p>
        개인정보 처리에 관한 문의:{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-indigo-600 underline hover:text-indigo-700"
        >
          {CONTACT_EMAIL}
        </a>
      </p>
    ),
  },
];

const PrivacyPolicyLayout: React.FC = () => {
  return (
    <div
      data-testid="privacy-page"
      className="min-h-screen py-10 px-5 bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to"
    >
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 md:p-10">
        <header className="mb-6 border-b border-gray-200 pb-5">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
          <p className="text-sm text-gray-500">시행일: {EFFECTIVE_DATE}</p>
        </header>

        <p className="text-gray-600 leading-relaxed mb-8">
          class-planner(이하 &lsquo;서비스&rsquo;)는 최소 수집과 익명 처리 원칙을
          따릅니다. 본 방침은 서비스가 처리하는 정보와 목적, 보관 기간을 안내합니다.
        </p>

        <div className="space-y-7">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h2>
              <div className="text-sm text-gray-700 leading-relaxed">{s.body}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyLayout;
