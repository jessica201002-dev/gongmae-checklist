// Design Ref: §3.3, §7.4 — 배지 두 종류
//  - StatusBadge: 기한 상태 "임박"(기일 2영업일 전부터) / "기일 경과"(기일 이후)
//  - ReviewBadge: "검토 필요"(미완료 항목이 있는 물건). 기한 상태와는 따로 표시한다.
// 표시할 상태가 없으면(낙찰일 없음, 아직 여유 있음, 6개 모두 완료) 기한 배지는 아무것도 그리지 않는다.
// 색에만 기대지 않도록 글자와 작은 아이콘으로도 상태를 적는다. (공통 .badge 스타일: app/design-system.css)
import { DEADLINE_STATUS_LABELS, type DeadlineStatus } from "@/lib/deadline";

const ICON = {
  className: "icon",
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export default function StatusBadge({ status }: { status: DeadlineStatus | null }) {
  if (!status) return null;
  const overdue = status === "overdue";
  return (
    <span className={`badge ${overdue ? "badge-danger" : "badge-warn"}`}>
      <svg {...ICON}>
        {overdue ? (
          <>
            <circle cx="8" cy="8" r="6" />
            <path d="M8 4.5V8l2.2 1.4" />
          </>
        ) : (
          <>
            <path d="M8 2.2l6 10.6H2z" />
            <path d="M8 6.6v2.8M8 11.4h.01" />
          </>
        )}
      </svg>
      {DEADLINE_STATUS_LABELS[status]}
    </span>
  );
}

export function ReviewBadge() {
  return (
    <span className="badge badge-review">
      <svg {...ICON}>
        <circle cx="7" cy="7" r="4.2" />
        <path d="M10.2 10.2L13.5 13.5" />
      </svg>
      검토 필요
    </span>
  );
}
