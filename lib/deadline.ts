// Design Ref: §3.3, §4.2 — 매각결정기일과 기한 규칙은 이 파일에 모은다.
// (임박/기일 경과 판정은 PLAN 작업 3에서 이 파일에 추가한다.)
import { addBusinessDays } from "./businessDays";

/** 낙찰일로부터 매각결정기일까지의 영업일 수 */
export const DECISION_BUSINESS_DAYS = 7;

// Plan SC: FR-04 — 매각결정기일 = 낙찰일로부터 7영업일 (주말·공휴일 목록 제외).
// 낙찰일 당일은 세지 않고, 낙찰일 다음 영업일을 1일차로 센다.
/** 낙찰일("YYYY-MM-DD")로 매각결정기일("YYYY-MM-DD")을 계산한다 */
export function calcDecisionDate(awardDate: string): string {
  return addBusinessDays(awardDate, DECISION_BUSINESS_DAYS);
}
