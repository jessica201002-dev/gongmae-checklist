"use client";

// Design Ref: §7.1, §7.4 — 온비드 조회 버튼(담당자 전용). 물건번호로 온비드 공개 정보를 조회해
// 낙찰일을 입력칸에 채워 주고 공개 물건 기본 정보를 보여 준다. 채우기만 하고 저장은 담당자가 확인한 뒤 따로 누른다.
// 조회에 실패하거나 결과가 없어도 낙찰일 직접 입력은 그대로 쓸 수 있다.
import { useRef, useState } from "react";
import { ApiClientError, callApi } from "@/lib/apiClient";
import {
  ONBID_NOT_FOUND_MESSAGE,
  ONBID_UNAVAILABLE_MESSAGES,
  type OnbidLookupResult,
} from "@/lib/onbidTypes";

const GENERIC_ERROR = "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

type Outcome =
  | { kind: "filled"; message: string; info: { label: string; value: string }[]; sample: boolean }
  | { kind: "info"; message: string; info: { label: string; value: string }[]; sample: boolean }
  | { kind: "problem"; message: string };

export default function OnbidLookup({
  caseId,
  blocked,
  bidDateAllowed,
  onFill,
}: {
  caseId: string;
  /** 다른 저장이 진행 중이면 true: 누르지 않게 한다 */
  blocked: boolean;
  /** 낙찰일로 받을 수 있는 날짜인지 (입력칸의 허용 범위) */
  bidDateAllowed: (ymd: string) => boolean;
  /** 낙찰일 입력칸에 값을 채운다 (저장은 하지 않음) */
  onFill: (ymd: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // 조회 중에 다른 물건으로 바뀌어도 이전 결과를 반영하지 않도록 최신 요청만 받는다
  const requestId = useRef(0);

  async function handleLookup() {
    if (loading || blocked) return;
    const mine = ++requestId.current;
    setLoading(true);
    setOutcome(null);
    try {
      const result = await callApi<OnbidLookupResult>(`/api/cases/${caseId}/onbid`, {
        method: "POST",
      });
      if (mine !== requestId.current) return;
      setOutcome(describe(result, bidDateAllowed, onFill));
    } catch (err) {
      if (mine !== requestId.current) return;
      setOutcome({
        kind: "problem",
        message: err instanceof ApiClientError ? err.message : GENERIC_ERROR,
      });
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }

  const info = outcome && outcome.kind !== "problem" ? outcome.info : [];

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleLookup}
          aria-disabled={loading || blocked}
          className="min-h-11 rounded-md border border-border bg-background px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          {loading ? "온비드 조회 중..." : "온비드에서 낙찰일 조회"}
        </button>
        <span className="text-xs text-muted">
          물건번호로 온비드에 공개된 정보만 읽어 옵니다. 앱의 내용은 온비드로 보내지 않습니다.
        </span>
      </div>
      <p
        aria-live="polite"
        className={
          "text-sm " +
          (outcome?.kind === "problem" ? "font-medium text-warn-fg" : "text-foreground")
        }
      >
        {outcome?.message}
      </p>
      {outcome && outcome.kind !== "problem" && outcome.sample && (
        <p className="rounded-md bg-notice-bg px-3 py-2 text-xs font-medium text-notice-fg">
          ※ 가상(샘플) 데이터입니다. 실제 온비드 정보가 아니라 시험용으로 지어낸 값입니다.
        </p>
      )}
      {info.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border border-border bg-background p-3 text-sm">
          {info.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-muted">{row.label}</dt>
              <dd className="break-words">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** 조회 결과를 화면 문구로 바꾸고, 낙찰일이 있으면 입력칸에 채운다 */
function describe(
  result: OnbidLookupResult,
  bidDateAllowed: (ymd: string) => boolean,
  onFill: (ymd: string) => void,
): Outcome {
  if (result.status === "unavailable") {
    return { kind: "problem", message: ONBID_UNAVAILABLE_MESSAGES[result.reason] };
  }
  if (result.status === "not_found") {
    return { kind: "problem", message: ONBID_NOT_FOUND_MESSAGE };
  }
  if (result.bidDate === null) {
    return {
      kind: "info",
      message: "온비드에 낙찰일 정보가 없습니다. 낙찰일은 직접 입력해 주세요.",
      info: result.info,
      sample: result.sample === true,
    };
  }
  if (!bidDateAllowed(result.bidDate)) {
    return {
      kind: "info",
      message: `온비드의 낙찰일(${result.bidDate})은 입력 가능한 범위(2000~2099년) 밖이라 채우지 않았습니다. 낙찰일은 직접 입력해 주세요.`,
      info: result.info,
      sample: result.sample === true,
    };
  }
  onFill(result.bidDate);
  return {
    kind: "filled",
    message: `온비드의 낙찰일 ${result.bidDate}을(를) 입력칸에 채웠습니다. 확인한 뒤 "저장"을 눌러 주세요.`,
    info: result.info,
    sample: result.sample === true,
  };
}
