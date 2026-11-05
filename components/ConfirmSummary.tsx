// Design Ref: §7.3 — 팀장·부점장 화면 위쪽의 결재선 확인 현황 한 줄 요약 (읽기 전용).
// 지금 불러온 물건을 그대로 센 값이다: 담당자·팀장 모두 확인 / 담당자만 확인 / 아직 확인 없음.
import { summarizeConfirm } from "@/lib/confirmation";
import type { CaseRecord } from "@/lib/types";

export default function ConfirmSummary({
  cases,
}: {
  cases: readonly Pick<CaseRecord, "staffConfirmedAt" | "managerConfirmedAt">[];
}) {
  const sum = summarizeConfirm(cases);
  const rows = [
    { label: "담당자·팀장 모두 확인", value: sum.both, tone: "badge-ok" },
    { label: "담당자만 확인", value: sum.staffOnly, tone: "badge-review" },
    { label: "아직 확인 없음", value: sum.none, tone: "badge-chip" },
  ];
  return (
    <section aria-labelledby="confirm-summary-title" className="flex flex-col gap-2">
      <h3 id="confirm-summary-title" className="section-title text-[15px]">
        결재선 확인 현황 <span className="text-xs font-medium text-muted">(담당자 → 팀장 → 부점장)</span>
      </h3>
      <ul className="surface-card flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 text-[13px]">
            <span className={`badge ${row.tone}`}>{row.label}</span>
            <strong className="text-lg tabular-nums">{row.value}</strong>
            <span className="text-muted">건</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
