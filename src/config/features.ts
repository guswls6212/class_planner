/**
 * 기능 가시성 플래그 (공부방 단독 배포 — schedule-v2 중심).
 *
 * 부가기능을 일반 사용자에게 숨긴다(코드 삭제 X). 한 곳에서 on/off.
 *
 * 개발자 escape hatch: 숨긴 기능을 보고 싶을 때
 *   - URL 에 `?dev=1` 추가 (그 네비게이션 동안 표시), 또는
 *   - 콘솔에서 `localStorage.setItem('cp:show-hidden','1')` (영구 — 끄려면 removeItem)
 * → devShowHidden() 가 true 가 되어 모든 숨긴 기능이 다시 보인다.
 * 일반 사용자(친구)는 이 플래그가 없으므로 계속 숨겨짐.
 */

export type FeatureKey =
  | "scheduleSharing" // 시간표 공유 (share-token, /share)
  | "parentAccessCodes" // 학부모 접속 코드 (/students 코드 UI, /academy)
  | "teamInvites" // 강사 초대 / 팀 권한 (settings Team, /invite)
  | "attendance" // 출결 (/attendance)
  | "pdfExport" // 시간표 PDF 인쇄
  | "multiAcademy" // 멀티 학원 전환 (sidebar academy switcher)
  | "dataSnapshots" // 데이터 스냅샷 (settings DataHistory)
  | "aboutPage" // /about + 랜딩 부가
  | "legacyScheduleEditor" // 기존 /schedule 편집 페이지
  | "tutorial"; // 온보딩 튜토리얼 (자동시작 + 설정 '다시 보기' 카드 + Sidebar 진입점)

/** 기본 숨김 여부. true = 일반 사용자에게 숨김. */
const HIDDEN: Record<FeatureKey, boolean> = {
  scheduleSharing: true,
  parentAccessCodes: true,
  teamInvites: true,
  attendance: true,
  pdfExport: true,
  multiAcademy: true,
  dataSnapshots: true,
  aboutPage: true,
  // schedule-v2 가 추가/수정/삭제를 모두 처리 → /schedule(수업 편집) 은퇴(숨김). 개발자 ?dev=1 로 접근.
  legacyScheduleEditor: true,
  // 공부방 단독 배포 — 온보딩 튜토리얼 숨김(자동시작 + 설정/Sidebar 진입점). 개발자 ?dev=1 로 표시.
  tutorial: true,
};

/** 개발자 전용: 숨긴 기능 전부 표시. `?dev=1` 또는 localStorage 'cp:show-hidden'='1'. */
export function devShowHidden(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("cp:show-hidden") === "1") return true;
    return new URLSearchParams(window.location.search).get("dev") === "1";
  } catch {
    return false;
  }
}

/**
 * URL 의 ?dev=1 → localStorage 'cp:show-hidden'='1' 로 영구 저장(이후 어디서나 숨긴 기능 표시).
 * ?dev=0 → 해제. AppShell 에서 navigation 마다 호출 → ?dev=1 한 번이면 전체 세션 유지.
 */
export function syncDevShowHiddenFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const dev = new URLSearchParams(window.location.search).get("dev");
    if (dev === "1") localStorage.setItem("cp:show-hidden", "1");
    else if (dev === "0") localStorage.removeItem("cp:show-hidden");
  } catch {
    /* localStorage 접근 불가 환경 — 무시 */
  }
}

/** 이 기능이 (일반 사용자에게) 숨겨져 있나? 개발자 모드면 항상 false. */
export function isHidden(key: FeatureKey): boolean {
  if (devShowHidden()) return false;
  return HIDDEN[key];
}

/** 이 기능을 보여줘야 하나? (isHidden 의 반대) */
export function isVisible(key: FeatureKey): boolean {
  return !isHidden(key);
}

/**
 * dev 모드를 무시한 "정적" 가시성 — 설정 파일(HIDDEN)만 본다.
 * SSR + 클라이언트 첫 렌더에 사용해 hydration mismatch 를 회피하고,
 * mount 이후에만 isVisible(dev 모드 반영)로 전환한다 (useFeatureGate / useHasMounted).
 */
export function featureVisibleStatic(key: FeatureKey): boolean {
  return !HIDDEN[key];
}
