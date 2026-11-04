// Design Ref: §4.2, §7.3, §7.4 — 팀장·부점장 열람 화면의 정렬·걸러 보기·구분값별 요약 규칙.
// 화면과 분리한 순수 계산이라 값만 넣으면 결과를 바로 확인할 수 있다.
import type { CaseView } from "./caseView";

// Plan SC: FR-08 — 미완료 항목이 1개라도 있는 물건은 "검토 필요"다. (기한 상태와는 따로 센다)
/** 검토 필요: 6개 항목이 모두 완료로 계산되지 않은 물건 */
export function needsReview(item: CaseView): boolean {
  return !item.isComplete;
}

/**
 * 팀장·부점장용 정렬: "검토 필요" 물건이 먼저, 같은 묶음 안에서는 매각결정기일이 빠른 순,
 * 낙찰일이 없는(기일이 없는) 물건은 묶음의 맨 뒤. 기일이 같으면 원래(등록) 순서를 지킨다.
 */
export function sortForReview(cases: readonly CaseView[]): CaseView[] {
  return [...cases].sort((a, b) => {
    const groupA = needsReview(a) ? 0 : 1;
    const groupB = needsReview(b) ? 0 : 1;
    if (groupA !== groupB) return groupA - groupB;
    if (a.decisionDate === b.decisionDate) return 0;
    if (a.decisionDate === null) return 1;
    if (b.decisionDate === null) return -1;
    // "YYYY-MM-DD" 문자열은 사전순 비교가 날짜순과 같다
    return a.decisionDate < b.decisionDate ? -1 : 1;
  });
}

/** 목록에 있는 담당자 구분값(중복 없이, 가나다·숫자 순) */
export function listOwnerCodes(cases: readonly CaseView[]): string[] {
  return [...new Set(cases.map((item) => item.ownerCode))].sort((a, b) =>
    a.localeCompare(b, "ko"),
  );
}

/** 담당자 구분값으로 걸러 본다. owner가 빈 문자열이면 전체 */
export function filterByOwner(
  cases: readonly CaseView[],
  owner: string,
): CaseView[] {
  return owner === "" ? [...cases] : cases.filter((item) => item.ownerCode === owner);
}

/** 진행 현황 한 줄: 물건 수, 검토 필요, 임박, 기일 경과 */
export interface ProgressCounts {
  total: number;
  needsReview: number;
  imminent: number;
  overdue: number;
}

export interface OwnerSummary extends ProgressCounts {
  ownerCode: string;
}

// Plan SC: FR-14 — 완료된 물건은 임박·기일 경과에서 제외한다(deadlineStatus가 이미 null이다).
function countProgress(cases: readonly CaseView[]): ProgressCounts {
  return {
    total: cases.length,
    needsReview: cases.filter(needsReview).length,
    imminent: cases.filter((item) => item.deadlineStatus === "imminent").length,
    overdue: cases.filter((item) => item.deadlineStatus === "overdue").length,
  };
}

/** 담당자 구분값별 진행 현황 (구분값 순) */
export function summarizeByOwner(cases: readonly CaseView[]): OwnerSummary[] {
  return listOwnerCodes(cases).map((ownerCode) => ({
    ownerCode,
    ...countProgress(cases.filter((item) => item.ownerCode === ownerCode)),
  }));
}

/** 전체 합계 */
export function summarizeAll(cases: readonly CaseView[]): ProgressCounts {
  return countProgress(cases);
}
