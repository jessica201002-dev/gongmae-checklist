// Design Ref: §7.1, §7.3, §7.4 — 물건 목록. 물건을 누르면 상세(체크리스트)가 열리고,
// 담당자에게는 삭제 버튼도 보인다. 팀장·부점장에게는 목록만 보인다(열람 전용). 등록 순으로 보여 준다.
// 카드는 왼쪽 표시선(기한·완료·검토 필요)과 작은 진행률 바로 상태를 한눈에 보여 주고, 눌러서 상세를 연다.
import StatusBadge, { ReviewBadge } from "@/components/StatusBadge";
import type { CaseView } from "@/lib/caseView";
import { formatYmdWithWeekday } from "@/lib/dateFormat";

/** 왼쪽 표시선의 색: 기일 경과 > 임박 > 완료 > 검토 필요(미완료) 순서로 정한다. 색 외에 배지 글자로도 알린다 */
function toneOf(item: CaseView): "danger" | "warn" | "ok" | "review" {
  if (item.deadlineStatus === "overdue") return "danger";
  if (item.deadlineStatus === "imminent") return "warn";
  if (item.isComplete) return "ok";
  return "review";
}

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
      <div className="surface-card border-dashed p-5">
        <p className="text-sm text-muted">
          등록된 물건이 없습니다.
          {editable ? " 위 폼에서 물건번호를 등록해 주세요." : ""}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {cases.map((item) => {
        const selected = item.id === selectedId;
        const percent = item.totalCount > 0 ? (item.completedCount / item.totalCount) * 100 : 0;
        return (
          <li
            key={item.id}
            className="list-card"
            data-tone={toneOf(item)}
            data-selected={selected}
          >
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={selected}
              className="list-main"
            >
              {/* 가장 중요한 식별 정보 + 상태 배지 */}
              <span className="flex flex-wrap items-center gap-2">
                <strong className="text-[15px] font-bold tracking-tight">{item.caseNo}</strong>
                {showReviewBadge && !item.isComplete && <ReviewBadge />}
                <StatusBadge status={item.deadlineStatus} />
                {item.isComplete && <span className="badge badge-ok">매각결정 완료</span>}
              </span>
              {/* 보조 정보: 담당자 구분값, 매각결정기일 */}
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                <span className="badge badge-chip">구분값 {item.ownerCode}</span>
                <span>
                  {item.decisionDate
                    ? `매각결정기일 ${formatYmdWithWeekday(item.decisionDate)}`
                    : "낙찰일 미입력"}
                </span>
              </span>
              {/* 진행 현황 (실제 완료 수) */}
              <span className="flex items-center gap-3">
                <span
                  className={"progress min-w-0 flex-1 " + (item.isComplete ? "progress-done" : "")}
                  aria-hidden="true"
                >
                  <span style={{ width: `${percent}%` }} />
                </span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                  체크 {item.completedCount}/{item.totalCount}
                </span>
              </span>
              {item.holidayRangeWarning && (
                <span className="block text-xs font-medium text-warn-fg">
                  ※ 공휴일 목록 범위 밖이라 매각결정기일이 정확하지 않을 수 있습니다.
                </span>
              )}
            </button>
            {editable && (
              <div className="flex items-start p-3 pl-0">
                <button
                  type="button"
                  onClick={() => {
                    if (deletingId === item.id) return;
                    onDelete(item);
                  }}
                  aria-disabled={deletingId === item.id}
                  aria-label={`${item.caseNo} 물건 삭제`}
                  className="btn btn-danger btn-sm"
                >
                  {deletingId === item.id ? "삭제 중..." : "삭제"}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
