import CaseList from "@/components/CaseList";

// 본문: 물건 목록. (체크리스트 상세와 열람 화면은 이후 작업에서 이어서 붙인다.)
export default function Home() {
  return (
    <section aria-labelledby="case-list-title" className="flex flex-col gap-4">
      <h2 id="case-list-title" className="text-base font-semibold">
        물건 목록
      </h2>
      <CaseList />
    </section>
  );
}
