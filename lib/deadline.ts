// Design Ref: §3.3, §4.2 — 매각결정기일과 기한 상태("임박" / "기일 경과") 규칙은 이 파일에 모은다.
import {
  addBusinessDays,
  isValidYmd,
  subtractBusinessDays,
} from "./businessDays";

/** 낙찰일로부터 매각결정기일까지의 영업일 수 */
export const DECISION_BUSINESS_DAYS = 7;

/** 기일 며칠(영업일) 전부터 "임박"으로 표시하는지 */
export const IMMINENT_BUSINESS_DAYS_BEFORE = 2;

/** 기한 상태: 임박 / 기일 경과. 표시할 상태가 없으면 null (다른 상태는 만들지 않는다) */
export type DeadlineStatus = "imminent" | "overdue";

/** 화면에 보이는 기한 상태 문구 */
export const DEADLINE_STATUS_LABELS: Readonly<Record<DeadlineStatus, string>> = {
  imminent: "임박",
  overdue: "기일 경과",
};

// Plan SC: FR-04 — 매각결정기일 = 낙찰일로부터 7영업일 (주말·공휴일 목록 제외).
// 낙찰일 당일은 세지 않고, 낙찰일 다음 영업일을 1일차로 센다.
/** 낙찰일("YYYY-MM-DD")로 매각결정기일("YYYY-MM-DD")을 계산한다 */
export function calcDecisionDate(awardDate: string): string {
  return addBusinessDays(awardDate, DECISION_BUSINESS_DAYS);
}

/** 한국 시간(Asia/Seoul) 기준 오늘 날짜 "YYYY-MM-DD". 시험할 때는 now를 넘길 수 있다 */
export function todayInSeoul(now: Date = new Date()): string {
  // en-CA 형식은 "YYYY-MM-DD"로 나온다
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// Plan SC: FR-06 — 기일 2영업일 전부터 "임박", 기일이 지나면 "기일 경과".
// 6개 항목이 모두 완료된 물건("매각결정 완료")에는 기한 상태를 표시하지 않는다.
/**
 * 기한 상태를 판정한다.
 * @param decisionDate 매각결정기일 ("YYYY-MM-DD")
 * @param today 오늘 날짜 ("YYYY-MM-DD", 보통 todayInSeoul())
 * @param isComplete 6개 항목이 모두 완료로 계산되는지 (checklist의 isCaseComplete 결과)
 */
export function getDeadlineStatus(
  decisionDate: string,
  today: string,
  isComplete: boolean,
): DeadlineStatus | null {
  if (!isValidYmd(decisionDate)) {
    throw new RangeError(`올바른 날짜가 아닙니다: ${decisionDate}`);
  }
  if (!isValidYmd(today)) {
    throw new RangeError(`올바른 날짜가 아닙니다: ${today}`);
  }
  if (isComplete) return null;
  // "YYYY-MM-DD" 문자열은 사전순 비교가 날짜순과 같다
  if (today > decisionDate) return "overdue";
  const imminentStart = subtractBusinessDays(
    decisionDate,
    IMMINENT_BUSINESS_DAYS_BEFORE,
  );
  if (today >= imminentStart) return "imminent";
  return null;
}
