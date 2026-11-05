// Design Ref: §4.2, §5.6, §7.3 — 결재선 확인 표시: 담당자 → 팀장 → 부점장.
// 담당자와 팀장은 "확인했다"는 표시를 남기고, 부점장은 그 표시를 보며 열람만 한다.
// ※ 이것은 확인 표시일 뿐 앱 안의 결재 처리가 아니다. 부점장의 결재는 앱 밖에서 진행한다. (PRD 6번)
// ※ 서버와 브라우저가 함께 쓰는 순수 규칙이다.
import type { CaseRecord } from "./types";
import type { Role } from "./role";

export type ConfirmLevel = "staff" | "manager";

export const CONFIRM_LEVELS: readonly { key: ConfirmLevel; label: string }[] = [
  { key: "staff", label: "담당자" },
  { key: "manager", label: "팀장" },
];

export function isConfirmLevel(value: unknown): value is ConfirmLevel {
  return value === "staff" || value === "manager";
}

/** 이 역할이 남길 수 있는 확인 단계. 부점장은 열람만 하므로 null */
export function confirmLevelOfRole(role: Role): ConfirmLevel | null {
  if (role === "staff") return "staff";
  if (role === "manager") return "manager";
  return null;
}

export interface ConfirmState {
  staff: boolean;
  manager: boolean;
}

export function confirmStateOf(
  record: Pick<CaseRecord, "staffConfirmedAt" | "managerConfirmedAt">,
): ConfirmState {
  return {
    staff: record.staffConfirmedAt !== null,
    manager: record.managerConfirmedAt !== null,
  };
}

/** 확인 현황 요약: 담당자·팀장 모두 확인 / 담당자만 확인 / 아직 확인 없음 */
export function summarizeConfirm(
  cases: readonly Pick<CaseRecord, "staffConfirmedAt" | "managerConfirmedAt">[],
): { both: number; staffOnly: number; none: number } {
  let both = 0;
  let staffOnly = 0;
  let none = 0;
  for (const item of cases) {
    const state = confirmStateOf(item);
    if (state.staff && state.manager) both += 1;
    else if (state.staff) staffOnly += 1;
    else none += 1;
  }
  return { both, staffOnly, none };
}
