// Design Ref: §7.3, §7.4 — 물건마다 결재선 확인 표시(담당자 → 팀장)를 체크로 보여 주는 작은 칩.
// 확인했으면 초록 체크 + "확인", 아니면 빈 동그라미 + "미확인"으로 글자와 모양으로도 구분한다.
// 부점장은 이 표시를 보고 열람한다. (부점장의 결재는 앱 밖)
import { CONFIRM_LEVELS, confirmStateOf } from "@/lib/confirmation";
import type { CaseRecord } from "@/lib/types";

export default function ConfirmChips({
  record,
}: {
  record: Pick<CaseRecord, "staffConfirmedAt" | "managerConfirmedAt">;
}) {
  const state = confirmStateOf(record);
  return (
    <span className="flex flex-wrap items-center gap-1.5" role="group" aria-label="결재선 확인 현황">
      {CONFIRM_LEVELS.map((level) => {
        const done = state[level.key];
        return (
          <span key={level.key} className={`badge ${done ? "badge-ok" : "badge-chip"}`}>
            <svg
              className="icon"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {done ? (
                <path d="M3 8.5l3.2 3.2L13 4.8" />
              ) : (
                <circle cx="8" cy="8" r="4.6" />
              )}
            </svg>
            {level.label} {done ? "확인" : "미확인"}
          </span>
        );
      })}
    </span>
  );
}
