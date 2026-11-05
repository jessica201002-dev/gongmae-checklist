// 디자인: 페이지 위쪽의 큰 제목 영역. 새 기능을 약속하지 않고, 이미 있는 기능만 설명한다.
export default function Hero() {
  return (
    <div className="grid gap-4 pb-2 lg:grid-cols-[1.2fr_1fr] lg:items-end">
      <div className="flex flex-col gap-3">
        <p className="reveal text-xs font-semibold tracking-[0.18em] text-muted">
          압류재산 공매업무 · 매각결정 단계
        </p>
        <h2 className="reveal text-3xl font-semibold leading-tight tracking-tight sm:text-4xl" style={{ animationDelay: "80ms" }}>
          매각결정,
          <br />
          <span className="headline-accent">놓치지 않게.</span>
        </h2>
      </div>
      <p className="reveal text-sm leading-relaxed text-muted" style={{ animationDelay: "160ms" }}>
        물건별 확인 항목과 매각결정기일을 한눈에 보고, 기한 안에 빠짐없이 처리하세요.
        판단은 사람이 하고, 앱은 체크와 기한 계산을 돕습니다.
      </p>
    </div>
  );
}
