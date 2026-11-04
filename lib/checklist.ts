// Design Ref: §5.3 — 체크리스트 항목 6개는 이 파일 한 곳에서만 정의한다.
// 화면과 서버 모두 이 정의를 가져다 쓴다. 항목을 임의로 추가·삭제·이름 변경하지 않는다.
import type { CheckStatus, ItemState } from "./types";

/** 체크 항목 6개 (순서가 화면에 보이는 순서) */
export const CHECKLIST_ITEMS = [
  // 송달 여부 확인에는 등기번호 입력란이 함께 붙는다 (PRD 5번)
  { key: "delivery", label: "송달 여부 확인", hasRegNoField: true },
  { key: "benefit", label: "공매 실익 여부 확인", hasRegNoField: false },
  { key: "appraisal", label: "감정가 확인", hasRegNoField: false },
  {
    key: "area_match",
    label: "공부와 공고 간 면적 등 일치 여부 확인",
    hasRegNoField: false,
  },
  {
    key: "suspension_doc",
    label: "공매중지문서 접수 여부 확인",
    hasRegNoField: false,
  },
  { key: "field_survey", label: "현황조사 확인", hasRegNoField: false },
] as const;

/** 항목 이름표 (표의 item_key 값) */
export type ItemKey = (typeof CHECKLIST_ITEMS)[number]["key"];

/** 물건 하나의 항목별 상태. 값이 없거나 null이면 미완료 */
export type ChecksByItem = Partial<Record<ItemKey, ItemState>>;

/** 전체 항목 수 (항상 6) */
export const TOTAL_ITEMS: number = CHECKLIST_ITEMS.length;

/** 문자열이 알려진 항목 이름표인지 확인 (서버가 입력을 검사할 때 사용) */
export function isItemKey(value: unknown): value is ItemKey {
  return CHECKLIST_ITEMS.some((item) => item.key === value);
}

/** 문자열이 저장 가능한 체크 상태("done" 또는 "na")인지 확인 */
export function isCheckStatus(value: unknown): value is CheckStatus {
  return value === "done" || value === "na";
}

// Plan SC: FR-02 — "해당 없음"은 완료로 계산한다.
/** 항목 하나가 완료로 계산되는지: 완료 또는 해당 없음이면 true */
export function isItemComplete(state: ItemState | undefined): boolean {
  return state === "done" || state === "na";
}

/** 완료로 계산되는 항목 수 (완료 + 해당 없음). 알려진 6개 항목만 센다 */
export function countCompleted(checks: ChecksByItem): number {
  return CHECKLIST_ITEMS.filter((item) => isItemComplete(checks[item.key]))
    .length;
}

/** 아직 완료가 아닌 항목 수 */
export function countIncomplete(checks: ChecksByItem): number {
  return TOTAL_ITEMS - countCompleted(checks);
}

// Plan SC: FR-03 — 미완료 항목이 1개라도 있으면 "매각결정 완료"가 아니다.
/** 6개 항목이 모두 완료로 계산될 때만 true ("매각결정 완료") */
export function isCaseComplete(checks: ChecksByItem): boolean {
  return countCompleted(checks) === TOTAL_ITEMS;
}
