// 디자인: 프리미엄 지표 카드 — 그라데이션 배경 + 추상 SVG 그래픽 + 도트 숫자 + 설명.
// 숫자는 항상 실제 집계값을 받아 그린다(꾸며 낸 값을 넣지 않는다).
import type { CSSProperties, ReactNode } from "react";
import DotMatrixNumber from "@/components/DotMatrixNumber";

export type CardTone = "rose" | "purple" | "coral" | "slate";

const TONE_CLASS: Record<CardTone, string> = {
  rose: "card-rose",
  purple: "card-purple",
  coral: "card-coral",
  slate: "card-slate",
};

/** 카드마다 뜻이 다른 배경 그래픽 (장식이므로 화면 낭독기에서는 숨긴다) */
function Art({ tone }: { tone: CardTone }): ReactNode {
  const common = {
    "aria-hidden": true,
    viewBox: "0 0 200 140",
    className: "card-art right-0 bottom-0 h-full w-full opacity-45",
    fill: "none",
    stroke: "rgba(255,255,255,.55)",
    strokeWidth: 1,
    preserveAspectRatio: "xMaxYMax slice",
  } as const;

  if (tone === "rose") {
    // 동심원과 작은 점
    return (
      <svg {...common}>
        <g className="art-pulse">
          {[28, 48, 68, 88, 108].map((r) => (
            <circle key={r} cx="150" cy="96" r={r} />
          ))}
        </g>
        {[[96, 40], [128, 28], [176, 58], [118, 92], [168, 118], [140, 66]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.4" fill="rgba(255,255,255,.8)" stroke="none" />
        ))}
      </svg>
    );
  }
  if (tone === "purple") {
    // 체크 표시를 둘러싼 원형 링
    return (
      <svg {...common}>
        <g className="art-pulse">
          <circle cx="150" cy="92" r="52" strokeDasharray="3 5" />
          <circle cx="150" cy="92" r="38" />
          <circle cx="150" cy="92" r="24" strokeOpacity=".6" />
        </g>
        <path d="M134 92l11 11 22-24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" stroke="rgba(255,255,255,.85)" />
      </svg>
    );
  }
  if (tone === "coral") {
    // 데이터 노드와 연결선
    const nodes: [number, number][] = [[96, 30], [140, 56], [176, 28], [118, 104], [168, 112]];
    return (
      <svg {...common}>
        <g className="art-pulse">
          {[[0, 1], [1, 2], [1, 3], [3, 4], [1, 4]].map(([a, b]) => (
            <line key={`${a}-${b}`} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} />
          ))}
        </g>
        {nodes.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="rgba(255,255,255,.85)" stroke="none" />
        ))}
      </svg>
    );
  }
  // slate: 얇은 격자와 대기 표시
  return (
    <svg {...common}>
      <g className="art-pulse">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={`h${i}`} x1="80" y1={30 + i * 20} x2="200" y2={30 + i * 20} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={`v${i}`} x1={90 + i * 18} y1="20" x2={90 + i * 18} y2="140" />
        ))}
      </g>
    </svg>
  );
}

export default function PremiumMetricCard({
  tone,
  label,
  value,
  caption,
  index,
}: {
  tone: CardTone;
  label: string;
  value: number;
  caption: string;
  /** 카드가 100ms 간격으로 차례로 나타나도록 하는 순서 */
  index: number;
}) {
  return (
    <div
      className={`premium-card reveal-card flex min-h-56 flex-col justify-between p-5 ${TONE_CLASS[tone]}`}
      style={{ "--i": index } as CSSProperties}
    >
      <Art tone={tone} />
      <p className="text-sm font-semibold tracking-wide">{label}</p>
      <div className="h-14 text-white sm:h-16">
        <DotMatrixNumber value={value} className="block h-full" />
      </div>
      <p className="text-sm font-medium">{caption}</p>
    </div>
  );
}
