"use client";

// Design Ref: §7.3, §7.4 — 담당자 구분값별 걸러 보기. 모든 역할이 쓸 수 있다.
import { useId } from "react";

export default function OwnerFilter({
  owners,
  value,
  onChange,
}: {
  owners: string[];
  /** 빈 문자열이면 전체 */
  value: string;
  onChange: (owner: string) => void;
}) {
  const selectId = useId();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={selectId} className="field-label">
        구분값별로 보기
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field w-auto min-w-36"
      >
        <option value="">전체</option>
        {owners.map((owner) => (
          <option key={owner} value={owner}>
            {owner}
          </option>
        ))}
      </select>
    </div>
  );
}
