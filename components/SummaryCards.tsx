// Design Ref: §7.3 — 화면 위쪽의 진행 현황 카드 4개 (읽기 전용).
// 숫자는 모두 지금 불러온 물건 목록을 그대로 센 값이다. 담당자는 내 물건만, 팀장·부점장은 전체가 서버에서 온다.
import PremiumMetricCard from "@/components/PremiumMetricCard";
import type { CaseView } from "@/lib/caseView";
import { summarizeAll } from "@/lib/reviewList";

export default function SummaryCards({
  cases,
  title = "전체 진행 현황",
}: {
  cases: CaseView[];
  /** 팀장·부점장은 "전체 진행 현황", 담당자는 "내 진행 현황" */
  title?: string;
}) {
  const all = summarizeAll(cases);
  const complete = all.total - all.needsReview;
  const deadline = all.imminent + all.overdue;

  return (
    <section aria-labelledby="summary-cards-title" className="flex flex-col gap-3">
      <h3 id="summary-cards-title" className="text-base font-semibold">
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumMetricCard
          index={0}
          tone="rose"
          label="전체 물건"
          value={all.total}
          caption={title === "전체 진행 현황" ? "등록된 물건 수" : "내가 맡은 물건 수"}
        />
        <PremiumMetricCard
          index={1}
          tone="purple"
          label="매각결정 완료"
          value={complete}
          caption="6개 항목이 모두 완료된 물건"
        />
        <PremiumMetricCard
          index={2}
          tone="coral"
          label="검토 필요"
          value={all.needsReview}
          caption="미완료 항목이 있는 물건"
        />
        <PremiumMetricCard
          index={3}
          tone="slate"
          label="기한 확인"
          value={deadline}
          caption={`임박 ${all.imminent}건 · 기일 경과 ${all.overdue}건`}
        />
      </div>
    </section>
  );
}
