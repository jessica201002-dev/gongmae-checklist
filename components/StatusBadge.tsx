// Design Ref: §3.3, §7.4 — 기한 상태 배지: "임박"(기일 2영업일 전부터) / "기일 경과"(기일 이후)
// 표시할 상태가 없으면(낙찰일 없음, 아직 여유 있음, 6개 모두 완료) 아무것도 그리지 않는다.
// 색에만 기대지 않도록 글자로도 상태를 적는다.
import { DEADLINE_STATUS_LABELS, type DeadlineStatus } from "@/lib/deadline";

export default function StatusBadge({ status }: { status: DeadlineStatus | null }) {
  if (!status) return null;
  const color =
    status === "overdue"
      ? "bg-danger-bg text-danger-fg"
      : "bg-warn-bg text-warn-fg";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}
    >
      {DEADLINE_STATUS_LABELS[status]}
    </span>
  );
}
