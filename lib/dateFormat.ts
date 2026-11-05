// 화면에 보여 줄 날짜 모양. 내부 계산은 "YYYY-MM-DD" 문자열 그대로 쓰고, 보여 줄 때만 요일을 붙인다.

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** ISO 시각("2026-11-05T01:23:45Z")을 한국 시간 날짜 "YYYY-MM-DD"로 */
export function formatDateSeoul(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** "2026-11-11" → "2026-11-11(수)". 올바른 "YYYY-MM-DD"일 때만 쓴다 */
export function formatYmdWithWeekday(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${ymd}(${WEEKDAYS[weekday]})`;
}
