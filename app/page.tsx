import CaseBoard from "@/components/CaseBoard";
import Hero from "@/components/Hero";

// 본문: 제목 영역 + 물건 목록과 체크리스트 상세.
export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <Hero />
      <section aria-labelledby="case-list-title" className="flex flex-col gap-4">
        <h3 id="case-list-title" className="text-xl font-semibold">
          물건 목록
        </h3>
        <CaseBoard />
      </section>
    </div>
  );
}
