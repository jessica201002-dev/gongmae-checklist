// Design Ref: §3.3, §4.2 — 영업일 더하기/빼기. 주말과 holidays.ts의 날짜는 영업일이 아니다.
// 날짜는 "YYYY-MM-DD" 문자열로 다룬다. (시간대 때문에 하루가 어긋나는 일을 막기 위해
// 내부 계산은 UTC 기준으로만 하고, 화면에 보이는 날짜 문자열과 항상 같게 유지한다.)
import { isHoliday } from "./holidays";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DD" 형식이면서 실제로 있는 날짜인지 (예: 2026-02-30은 false) */
export function isValidYmd(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = YMD_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function assertValidYmd(ymd: string): void {
  if (!isValidYmd(ymd)) {
    throw new RangeError(`올바른 날짜가 아닙니다: ${ymd}`);
  }
}

function toUtcMs(ymd: string): number {
  const [year, month, day] = ymd.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** 달력상 날짜를 days일만큼 옮긴다 (음수면 과거) */
function shiftDays(ymd: string, days: number): string {
  return fromUtcMs(toUtcMs(ymd) + days * MS_PER_DAY);
}

/** 토요일 또는 일요일인지 */
export function isWeekend(ymd: string): boolean {
  assertValidYmd(ymd);
  const dayOfWeek = new Date(toUtcMs(ymd)).getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/** 영업일인지: 주말도 아니고 공휴일 목록에도 없는 날 */
export function isBusinessDay(ymd: string): boolean {
  return !isWeekend(ymd) && !isHoliday(ymd);
}

function assertCount(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`영업일 수는 0 이상의 정수여야 합니다: ${count}`);
  }
}

// Plan SC: FR-04 — 시작일 당일은 세지 않고, 시작일 다음 영업일을 1일차로 센다.
/** 시작일 이후 count번째 영업일을 돌려준다. 시작일이 주말·공휴일이어도 같은 방식이다 */
export function addBusinessDays(start: string, count: number): string {
  assertValidYmd(start);
  assertCount(count);
  let current = start;
  let counted = 0;
  while (counted < count) {
    current = shiftDays(current, 1);
    if (isBusinessDay(current)) counted += 1;
  }
  return current;
}

/** 기준일 이전 count번째 영업일을 돌려준다 (예: 기일 − 2영업일). 기준일 당일은 세지 않는다 */
export function subtractBusinessDays(date: string, count: number): string {
  assertValidYmd(date);
  assertCount(count);
  let current = date;
  let counted = 0;
  while (counted < count) {
    current = shiftDays(current, -1);
    if (isBusinessDay(current)) counted += 1;
  }
  return current;
}
