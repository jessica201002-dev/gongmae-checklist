// 본문 자리: 물건 목록과 체크리스트 화면이 이곳에 들어간다.
export default function Home() {
  return (
    <section aria-labelledby="case-list-title" className="flex flex-col gap-2">
      <h2 id="case-list-title" className="text-base font-semibold">
        물건 목록
      </h2>
      <p className="text-sm text-muted">
        물건 목록이 이곳에 표시됩니다. (준비 중)
      </p>
    </section>
  );
}
