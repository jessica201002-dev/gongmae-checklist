// 화면에 보여 줄 날짜 모양. 내부 계산은 "YYYY-MM-DD" 문자열 그대로 쓰고, 보여 줄 때만 요일을 붙인다.

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** "2026-11-11" → "2026-11-11(수)". 올바른 "YYYY-MM-DD"일 때만 쓴다 */
export function formatYmdWithWeekday(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${ymd}(${WEEKDAYS[weekday]})`;
}
