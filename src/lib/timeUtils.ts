/**
 * 🕐 시간 유틸리티 함수들
 *
 * 프로젝트 전체에서 일관된 한국/일본 시간(KST/JST)을 사용하기 위한 유틸리티입니다.
 * UTC+9 시간대를 기준으로 합니다.
 */

// 한국/일본 시간대 (UTC+9)
const KST_TIMEZONE = "Asia/Seoul"; // 또는 'Asia/Tokyo'
const KST_OFFSET = 9 * 60; // 9시간을 분으로 변환

/**
 * 현재 한국 시간을 ISO 문자열로 반환합니다.
 * 기존 new Date().toISOString() 대체용
 */
export function getKSTTime(): string {
  const now = new Date();

  // 한국 시간으로 변환 (UTC + 9시간)
  const kstTime = new Date(now.getTime() + KST_OFFSET * 60 * 1000);

  // ISO 문자열로 변환하되, 'Z' 대신 '+09:00' 추가
  const isoString = kstTime.toISOString().replace("Z", "+09:00");

  return isoString;
}

/**
 * 🆕 KST 시간대의 Date 객체를 반환합니다.
 * localStorage에 저장할 Date 객체 생성용
 */
export function getKSTDate(): Date {
  // Intl.DateTimeFormat을 사용하여 정확한 KST 시간 생성
  const now = new Date();
  const kstTimeString = now.toLocaleString("sv-SE", {
    timeZone: KST_TIMEZONE,
  }); // 'sv-SE' 로케일은 'YYYY-MM-DD HH:mm:ss' 형식

  return new Date(kstTimeString);
}

/**
 * 🆕 Supabase용 KST 타임스탬프 (PostgreSQL timestamptz 호환)
 * Supabase에 저장할 때 사용
 */
export function getKSTTimestampForDB(): string {
  const now = new Date();

  // KST 시간을 PostgreSQL timestamptz 형식으로 변환
  const kstTimeString = now.toLocaleString("sv-SE", {
    timeZone: "Asia/Seoul",
  });

  // PostgreSQL timestamptz는 'YYYY-MM-DD HH:mm:ss+09:00' 형식을 완전히 지원
  return kstTimeString + "+09:00";
}

/**
 * 특정 Date 객체를 한국 시간 ISO 문자열로 변환합니다.
 */
export function toKSTString(date: Date): string {
  // 한국 시간으로 변환
  const kstTime = new Date(date.getTime() + KST_OFFSET * 60 * 1000);

  // ISO 문자열로 변환하되, 'Z' 대신 '+09:00' 추가
  const isoString = kstTime.toISOString().replace("Z", "+09:00");

  return isoString;
}

// 이 함수는 위에서 새로 정의된 getKSTDate()로 대체됨

/**
 * ISO 문자열을 한국 시간 기준으로 파싱합니다.
 */
export function parseKSTTime(isoString: string): Date {
  const date = new Date(isoString);

  // 이미 한국 시간이면 그대로 반환
  if (isoString.includes("+09:00") || isoString.includes("KST")) {
    return date;
  }

  // UTC 시간이면 한국 시간으로 변환
  return new Date(date.getTime() + KST_OFFSET * 60 * 1000);
}

/**
 * 한국 시간대 기준으로 날짜를 포맷팅합니다.
 */
export function formatKSTDate(
  date: Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: KST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const formatOptions = { ...defaultOptions, ...options };

  return new Intl.DateTimeFormat("ko-KR", formatOptions).format(date);
}

/**
 * 현재 한국 시간을 읽기 쉬운 형태로 반환합니다.
 */
export function getFormattedKSTTime(): string {
  return formatKSTDate(getKSTDate());
}

/**
 * 타임스탬프 비교를 위한 한국 시간 기준 밀리초 반환
 */
export function getKSTTimestamp(): number {
  return getKSTDate().getTime();
}

/**
 * 레거시 호환성을 위한 함수들
 * 기존 코드에서 new Date().toISOString()을 점진적으로 대체할 때 사용
 */

// 기존 new Date().toISOString() 대체용
export const getCurrentISOString = getKSTTime;

// 기존 new Date() 대체용
export const getCurrentDate = getKSTDate;

/**
 * 디버깅용 함수들
 */
export function getTimeZoneInfo() {
  const now = new Date();
  const utcTime = now.toISOString();
  const kstTime = getKSTTime();
  const localTime = now.toString();

  return {
    utc: utcTime,
    kst: kstTime,
    local: localTime,
    timezone: KST_TIMEZONE,
    offset: `UTC+${KST_OFFSET / 60}`,
  };
}

/**
 * 환경별 시간 설정 확인
 */
export function validateTimeSettings() {
  const info = getTimeZoneInfo();
  console.log("🕐 Time Settings:", info);

  // 한국 시간이 UTC보다 9시간 앞서는지 확인
  const utcDate = new Date(info.utc);
  const kstDate = new Date(info.kst);
  const hourDiff = (kstDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);

  if (Math.abs(hourDiff - 9) < 0.1) {
    console.log("✅ KST 시간 설정이 올바릅니다.");
  } else {
    console.warn("⚠️ KST 시간 설정에 문제가 있을 수 있습니다.", { hourDiff });
  }

  return Math.abs(hourDiff - 9) < 0.1;
}
