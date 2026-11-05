"use client";

// 디자인: LED 도트 매트릭스 숫자. 원형 점(SVG)으로 숫자를 그린다.
// 지표 카드의 큰 숫자에만 쓴다. 물건번호·날짜처럼 정확히 읽어야 하는 값에는 쓰지 않는다.
// 처음 나타날 때 0에서 실제 값까지 550ms 동안 올라가고, 값이 바뀌면 이전 값에서 새 값으로 이어진다.
// 모션 줄이기 설정이면 바로 최종 숫자를 보여 준다. 화면 낭독기에는 최종 숫자를 글자로 읽어 준다.
import { useEffect, useRef, useState } from "react";

// 5칸 × 7줄 글자 모양 ("#" = 켜진 점)
const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ",": ["000", "000", "000", "000", "000", "010", "100"],
  ".": ["00", "00", "00", "00", "00", "00", "10"],
  "-": ["000", "000", "000", "111", "000", "000", "000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
};

const PITCH = 6; // 점 사이 간격
const DOT_R = 2.1; // 점 반지름
const GAP = 4; // 글자 사이 간격
const DURATION = 550;

/** cubic-bezier(.16,1,.3,1)과 비슷하게 처음엔 빠르고 끝에서 천천히 멈추는 곡선 */
function ease(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function format(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export default function DotMatrixNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  // 화면에 그리는 값(애니메이션 중에는 최종 값과 다르다)
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = shownRef.current;
    let frame = 0;
    const start = performance.now();

    function tick(now: number) {
      const t = reduce ? 1 : Math.min(1, (now - start) / DURATION);
      const next = from + (value - from) * ease(t);
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const text = format(shown);
  // 글자별 가로 위치를 계산해 한 개의 SVG에 점을 모두 그린다
  let x = 0;
  const dots: { cx: number; cy: number; key: string }[] = [];
  [...text].forEach((ch, index) => {
    const glyph = GLYPHS[ch];
    if (!glyph) return;
    glyph.forEach((row, r) => {
      [...row].forEach((bit, c) => {
        if (bit === "1") {
          dots.push({
            cx: x + c * PITCH + DOT_R,
            cy: r * PITCH + DOT_R,
            key: `${index}-${r}-${c}`,
          });
        }
      });
    });
    x += glyph[0].length * PITCH + GAP;
  });
  const width = Math.max(x - GAP - (PITCH - DOT_R * 2), 1);
  const height = 6 * PITCH + DOT_R * 2;

  return (
    <span className={className}>
      <span className="sr-only">{format(value)}</span>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-auto"
        fill="currentColor"
      >
        {dots.map((dot) => (
          <circle key={dot.key} cx={dot.cx} cy={dot.cy} r={DOT_R} />
        ))}
      </svg>
    </span>
  );
}
