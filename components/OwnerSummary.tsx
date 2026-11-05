// Design Ref: §7.3, §7.4 — 팀장·부점장용 담당자 구분값별 진행 현황 요약 표 (읽기 전용).
// 구분값마다 물건 수, 검토 필요, 임박, 기일 경과를 한눈에 보여 준다.
import type { CaseView } from "@/lib/caseView";
import { summarizeAll, summarizeByOwner } from "@/lib/reviewList";

// 글자가 칸 안에서 끊기지 않게 하고, 좁은 화면에서 모자라면 표 전체를 가로로 스크롤한다
const cell = "px-3 py-2.5 text-right tabular-nums whitespace-nowrap sm:px-4";
const rowHead = "px-3 py-2.5 text-left whitespace-nowrap sm:px-4";

export default function OwnerSummary({ cases }: { cases: CaseView[] }) {
  const rows = summarizeByOwner(cases);
  if (rows.length === 0) return null;
  const all = summarizeAll(cases);

  return (
    <section aria-labelledby="owner-summary-title" className="flex flex-col gap-3">
      <h3 id="owner-summary-title" className="section-title text-[15px]">
        담당자 구분값별 진행 현황
      </h3>
      <div className="surface-card overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <caption className="sr-only">
            담당자 구분값별 물건 수, 검토 필요, 임박, 기일 경과 건수
          </caption>
          <thead className="bg-surface-soft text-muted">
            <tr>
              <th scope="col" className={rowHead + " font-semibold"}>구분값</th>
              <th scope="col" className={cell + " font-semibold"}>물건 수</th>
              <th scope="col" className={cell + " font-semibold"}>검토 필요</th>
              <th scope="col" className={cell + " font-semibold"}>임박</th>
              <th scope="col" className={cell + " font-semibold"}>기일 경과</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ownerCode} className="border-t border-line transition-colors hover:bg-surface-hover">
                <th scope="row" className={rowHead + " font-semibold"}>
                  {row.ownerCode}
                </th>
                <td className={cell}>{row.total}</td>
                <td className={cell}>{row.needsReview}</td>
                <td className={cell + (row.imminent > 0 ? " font-bold text-warn-fg" : "")}>
                  {row.imminent}
                </td>
                <td className={cell + (row.overdue > 0 ? " font-bold text-danger-fg" : "")}>
                  {row.overdue}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-surface-soft font-bold">
              <th scope="row" className={rowHead}>전체</th>
              <td className={cell}>{all.total}</td>
              <td className={cell}>{all.needsReview}</td>
              <td className={cell}>{all.imminent}</td>
              <td className={cell}>{all.overdue}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-muted">
        6개 항목이 모두 완료된 물건은 임박·기일 경과에 세지 않습니다.
      </p>
    </section>
  );
}
