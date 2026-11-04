import CaseBoard from "@/components/CaseBoard";

// 본문: 물건 목록과 체크리스트 상세. (낙찰일·등기번호 입력과 팀장·부점장 요약은 이후 작업에서 이어서 붙인다.)
export default function Home() {
  return (
    <section aria-labelledby="case-list-title" className="flex flex-col gap-4">
      <h2 id="case-list-title" className="text-base font-semibold">
        물건 목록
      </h2>
      <CaseBoard />
    </section>
  );
}
