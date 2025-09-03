export default function ManualPage() {
  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <h1>📚 클래스 플래너 사용자 매뉴얼</h1>

      <section style={{ marginBottom: 32 }}>
        <h2>🎯 개요</h2>
        <p>
          클래스 플래너는 학생 관리와 수업 일정을 효율적으로 관리할 수 있는 웹
          애플리케이션입니다. 개별 수업과 그룹 수업을 모두 지원하며, 직관적인
          드래그 앤 드롭 인터페이스를 제공합니다.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>🚀 주요 기능</h2>

        <h3>1. 학생 관리</h3>
        <ul>
          <li>
            <strong>학생 추가/수정/삭제</strong>: 학생 정보를 체계적으로 관리
          </li>
          <li>
            <strong>과목 관리</strong>: 각 학생별로 수강 과목 설정
          </li>
          <li>
            <strong>수강신청 관리</strong>: 학생과 과목을 연결하는 수강신청 정보
            관리
          </li>
        </ul>

        <h3>2. 수업 일정 관리</h3>
        <ul>
          <li>
            <strong>개별 수업</strong>: 한 명의 학생을 위한 개별 수업 생성
          </li>
          <li>
            <strong>그룹 수업</strong>: 여러 학생을 동시에 포함하는 그룹 수업
            생성
          </li>
          <li>
            <strong>시간표 시각화</strong>: 주간 시간표를 직관적으로 표시
          </li>
          <li>
            <strong>충돌 방지</strong>: 시간이 겹치는 수업 자동 감지 및 배치
          </li>
        </ul>

        <h3>3. 직관적인 인터페이스</h3>
        <ul>
          <li>
            <strong>드래그 앤 드롭</strong>: 학생을 시간표로 드래그하여 수업
            추가
          </li>
          <li>
            <strong>빈 공간 클릭</strong>: 시간표의 빈 공간을 클릭하여 수업 추가
          </li>
          <li>
            <strong>수업 편집</strong>: 기존 수업 클릭으로 편집 모달 열기
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>📖 상세 사용법</h2>

        <h3>학생 추가하기</h3>
        <ol>
          <li>
            <strong>Students</strong> 페이지로 이동
          </li>
          <li>
            <strong>학생 추가</strong> 버튼 클릭
          </li>
          <li>
            학생 이름 입력 후 <strong>추가</strong> 버튼 클릭
          </li>
        </ol>

        <h3>과목 추가하기</h3>
        <ol>
          <li>
            <strong>Students</strong> 페이지에서 학생 선택
          </li>
          <li>
            <strong>과목 추가</strong> 버튼 클릭
          </li>
          <li>
            과목명 입력 후 <strong>추가</strong> 버튼 클릭
          </li>
        </ol>

        <h3>수업 추가하기</h3>

        <h4>방법 1: 드래그 앤 드롭</h4>
        <ol>
          <li>
            <strong>Schedule</strong> 페이지로 이동
          </li>
          <li>좌측 학생 목록에서 학생 이름을 드래그</li>
          <li>원하는 시간대의 빈 공간에 드롭</li>
          <li>
            <strong>수업 추가</strong> 모달에서 세부 정보 입력
          </li>
          <li>
            <strong>추가</strong> 버튼 클릭
          </li>
        </ol>

        <h4>방법 2: 빈 공간 클릭</h4>
        <ol>
          <li>
            <strong>Schedule</strong> 페이지에서 원하는 시간대의 빈 공간 클릭
          </li>
          <li>
            <strong>수업 추가</strong> 모달에서 학생 선택 및 세부 정보 입력
          </li>
          <li>
            <strong>추가</strong> 버튼 클릭
          </li>
        </ol>

        <h3>그룹 수업 만들기</h3>
        <ol>
          <li>
            수업 추가 모달에서 <strong>학생 입력 필드</strong>에 학생 이름 입력
          </li>
          <li>
            <strong>Enter</strong> 키를 누르거나 <strong>추가</strong> 버튼
            클릭하여 학생 추가
          </li>
          <li>추가된 학생은 태그 형태로 표시</li>
          <li>
            <strong>X</strong> 버튼으로 개별 학생 제거 가능
          </li>
          <li>
            과목 선택 후 <strong>추가</strong> 버튼 클릭
          </li>
        </ol>

        <h3>수업 편집하기</h3>
        <ol>
          <li>시간표에서 기존 수업 블록 클릭</li>
          <li>
            <strong>수업 편집</strong> 모달에서 정보 수정
          </li>
          <li>
            <strong>저장</strong> 버튼으로 변경사항 적용
          </li>
          <li>
            <strong>삭제</strong> 버튼으로 수업 제거
          </li>
        </ol>

        <h3>시간표 다운로드</h3>
        <ol>
          <li>
            <strong>Schedule</strong> 페이지 우측 상단의{' '}
            <strong>시간표 다운로드</strong> 버튼 클릭
          </li>
          <li>PDF 형태로 시간표 다운로드</li>
          <li>
            <strong>🆕 세션 범위 기반 다운로드</strong>: 현재 표시된 세션의 시간
            범위에 맞춰 PDF 생성
          </li>
          <li>
            <strong>🆕 고품질 출력</strong>: 인쇄에 최적화된 고품질 PDF 생성
          </li>
        </ol>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>🎨 인터페이스 구성</h2>

        <h3>Schedule 페이지 레이아웃</h3>
        <ul>
          <li>
            <strong>좌측</strong>: 학생 목록 (드래그 가능)
          </li>
          <li>
            <strong>중앙</strong>: 주간 시간표 그리드
          </li>
          <li>
            <strong>우측 상단</strong>: 시간표 다운로드 버튼
          </li>
          <li>
            <strong>우측 하단</strong>: 플로팅 학생 패널
          </li>
        </ul>

        <h3>시간표 그리드</h3>
        <ul>
          <li>
            <strong>가로축</strong>: 요일 (월~일)
          </li>
          <li>
            <strong>세로축</strong>: 시간 (09:00~23:00)
          </li>
          <li>
            <strong>세션 블록</strong>: 수업 정보 표시
          </li>
          <li>
            <strong>색상</strong>: 과목별로 다른 색상 적용
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>🔧 고급 기능</h2>

        <h3>학생 선택 필터링</h3>
        <ul>
          <li>특정 학생 선택 시 해당 학생의 수업만 표시</li>
          <li>전체 학생 보기로 모든 수업 표시</li>
        </ul>

        <h3>자동 배치 알고리즘</h3>
        <ul>
          <li>시간이 겹치는 수업을 자동으로 세로로 배치</li>
          <li>최적의 공간 활용을 위한 지능형 레이아웃</li>
        </ul>

        <h3>반응형 디자인</h3>
        <ul>
          <li>다양한 화면 크기에 최적화</li>
          <li>모바일 및 태블릿 지원</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>🚨 주의사항</h2>

        <h3>데이터 저장</h3>
        <ul>
          <li>모든 변경사항은 브라우저의 로컬 스토리지에 자동 저장</li>
          <li>브라우저 데이터 삭제 시 정보 손실 주의</li>
        </ul>

        <h3>수업 충돌</h3>
        <ul>
          <li>같은 시간대에 같은 학생의 수업은 생성 불가</li>
          <li>시간이 겹치는 수업은 자동으로 세로 배치</li>
        </ul>

        <h3>그룹 수업 제한</h3>
        <ul>
          <li>그룹 수업은 같은 과목을 수강하는 학생들로만 구성 가능</li>
          <li>과목별로 다른 그룹 수업 생성</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>🆘 문제 해결</h2>

        <h3>수업이 추가되지 않는 경우</h3>
        <ol>
          <li>필수 필드가 모두 입력되었는지 확인</li>
          <li>학생이 선택되었는지 확인</li>
          <li>과목이 선택되었는지 확인</li>
          <li>시간이 올바르게 설정되었는지 확인</li>
        </ol>

        <h3>드래그 앤 드롭이 작동하지 않는 경우</h3>
        <ol>
          <li>학생 이름을 정확히 드래그했는지 확인</li>
          <li>드롭 영역이 올바른지 확인</li>
          <li>브라우저 새로고침 후 재시도</li>
        </ol>

        <h3>시간표가 표시되지 않는 경우</h3>
        <ol>
          <li>학생과 과목 데이터가 있는지 확인</li>
          <li>수강신청 정보가 올바르게 연결되었는지 확인</li>
          <li>브라우저 콘솔에서 오류 메시지 확인</li>
        </ol>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>📱 지원 브라우저</h2>
        <ul>
          <li>Chrome (권장)</li>
          <li>Firefox</li>
          <li>Safari</li>
          <li>Edge</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>🔄 업데이트 정보</h2>
        <ul>
          <li>
            <strong>v1.0.0</strong>: 기본 기능 구현
          </li>
          <li>
            <strong>v1.1.0</strong>: 그룹 수업 기능 추가
          </li>
          <li>
            <strong>v1.2.0</strong>: 태그 기반 학생 선택 시스템
          </li>
          <li>
            <strong>v1.3.0</strong>: 성능 최적화 및 UI 개선
          </li>
          <li>
            <strong>v1.4.0</strong>: 세션 범위 기반 PDF 다운로드 기능
          </li>
        </ul>
      </section>

      <footer
        style={{
          marginTop: 48,
          padding: 16,
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        <p>
          <strong>문의사항이나 버그 리포트는 개발팀에 연락해 주세요.</strong>
        </p>
      </footer>
    </div>
  );
}
