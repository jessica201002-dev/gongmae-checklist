// Design Ref: §7.1, §7.3, §7.4 — 물건 목록. 물건을 누르면 상세(체크리스트)가 열리고,
// 담당자에게는 삭제 버튼도 보인다. 팀장·부점장에게는 목록만 보인다(열람 전용). 등록 순으로 보여 준다.
import StatusBadge, { ReviewBadge } from "@/components/StatusBadge";
import type { CaseView } from "@/lib/caseView";
import { formatYmdWithWeekday } from "@/lib/dateFormat";

export default function CaseList({
  cases,
  selectedId,
  editable,
  showReviewBadge,
  deletingId,
  onSelect,
  onDelete,
}: {
  cases: CaseView[];
  selectedId: string | null;
  editable: boolean;
  /** 팀장·부점장 화면에서 미완료 물건에 "검토 필요" 배지를 보여 줄지 */
  showReviewBadge: boolean;
  deletingId: string | null;
  onSelect: (id: string) => void;
  onDelete: (item: CaseView) => void;
}) {
  if (cases.length === 0) {
    return (
      <p className="text-sm text-muted">
        등록된 물건이 없습니다.
        {editable ? " 위 폼에서 물건번호를 등록해 주세요." : ""}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {cases.map((item) => {
        const selected = item.id === selectedId;
        return (
          <li
            key={item.id}
            className={
              "flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between " +
              (selected ? "border-foreground bg-surface" : "border-border")
            }
          >
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={selected}
              className="flex flex-1 flex-col gap-1 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              <span className="flex flex-wrap items-center gap-2">
                <strong className="text-base">{item.caseNo}</strong>
                <span className="rounded bg-surface px-2 py-0.5 text-xs text-muted">
                  구분값 {item.ownerCode}
                </span>
                {showReviewBadge && !item.isComplete && <ReviewBadge />}
                <StatusBadge status={item.deadlineStatus} />
                {item.isComplete && (
                  <span className="text-xs font-semibold text-ok-fg">
                    매각결정 완료
                  </span>
                )}
              </span>
              <span className="block text-sm text-muted">
                체크 {item.completedCount}/{item.totalCount} ·{" "}
                {item.decisionDate
                  ? `매각결정기일 ${formatYmdWithWeekday(item.decisionDate)}`
                  : "낙찰일 미입력"}
              </span>
              {item.holidayRangeWarning && (
                <span className="block text-xs text-warn-fg">
                  ※ 공휴일 목록 범위 밖이라 매각결정기일이 정확하지 않을 수 있습니다.
                </span>
              )}
            </button>
            {editable && (
              <button
                type="button"
                onClick={() => onDelete(item)}
                disabled={deletingId === item.id}
                aria-label={`${item.caseNo} 물건 삭제`}
                className="min-h-11 self-start rounded-md border border-border px-4 text-sm font-medium text-danger-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-60 sm:self-center"
              >
                {deletingId === item.id ? "삭제 중..." : "삭제"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
