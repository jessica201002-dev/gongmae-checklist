// Design Ref: §3.3, §7.4 — 배지 두 종류
//  - StatusBadge: 기한 상태 "임박"(기일 2영업일 전부터) / "기일 경과"(기일 이후)
//  - ReviewBadge: "검토 필요"(미완료 항목이 있는 물건). 기한 상태와는 따로 표시한다.
// 표시할 상태가 없으면(낙찰일 없음, 아직 여유 있음, 6개 모두 완료) 기한 배지는 아무것도 그리지 않는다.
// 색에만 기대지 않도록 글자로도 상태를 적는다.
import { DEADLINE_STATUS_LABELS, type DeadlineStatus } from "@/lib/deadline";

const BADGE = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";

export default function StatusBadge({ status }: { status: DeadlineStatus | null }) {
  if (!status) return null;
  const color =
    status === "overdue"
      ? "bg-danger-bg text-danger-fg"
      : "bg-warn-bg text-warn-fg";
  return <span className={`${BADGE} ${color}`}>{DEADLINE_STATUS_LABELS[status]}</span>;
}

export function ReviewBadge() {
  return <span className={`${BADGE} bg-info-bg text-info-fg`}>검토 필요</span>;
}
