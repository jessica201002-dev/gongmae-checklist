// Design Ref: §4.2, §6 — 매각결정기일과 기한 상태는 저장하지 않고, 읽을 때마다 여기서 계산한다.
// (공휴일 목록이 바뀌어도 자동으로 반영된다.)
import { isOutsideHolidayRange } from "./holidays";
import {
  TOTAL_ITEMS,
  countCompleted,
  isCaseComplete,
  type ChecksByItem,
} from "./checklist";
import {
  calcDecisionDate,
  getDeadlineStatus,
  type DeadlineStatus,
} from "./deadline";
import type { CaseRecord } from "./types";

/** 화면에 보여 줄 물건 한 건: 저장된 값 + 체크 상태 + 계산한 값 */
export interface CaseView extends CaseRecord {
  checks: ChecksByItem;
  /** 완료로 계산되는 항목 수 (완료 + 해당 없음) */
  completedCount: number;
  /** 전체 항목 수 (항상 6) */
  totalCount: number;
  /** 6개 모두 완료인지 ("매각결정 완료") */
  isComplete: boolean;
  /** 매각결정기일. 낙찰일이 없으면 null */
  decisionDate: string | null;
  /** 기한 상태: "imminent"(임박) / "overdue"(기일 경과) / null(표시 없음) */
  deadlineStatus: DeadlineStatus | null;
  /** 낙찰일이나 기일이 공휴일 목록 범위 밖이라 기일이 정확하지 않을 수 있는지 */
  holidayRangeWarning: boolean;
}

/** 저장된 물건과 체크 상태로 화면용 물건 정보를 만든다. today는 한국 시간 "YYYY-MM-DD" */
export function buildCaseView(
  record: CaseRecord,
  checks: ChecksByItem,
  today: string,
): CaseView {
  const isComplete = isCaseComplete(checks);
  const decisionDate = record.bidDate ? calcDecisionDate(record.bidDate) : null;
  return {
    ...record,
    checks,
    completedCount: countCompleted(checks),
    totalCount: TOTAL_ITEMS,
    isComplete,
    decisionDate,
    deadlineStatus: decisionDate
      ? getDeadlineStatus(decisionDate, today, isComplete)
      : null,
    holidayRangeWarning:
      record.bidDate !== null &&
      decisionDate !== null &&
      (isOutsideHolidayRange(record.bidDate) ||
        isOutsideHolidayRange(decisionDate)),
  };
}
