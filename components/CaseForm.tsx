"use client";

// Design Ref: §7.3, §7.4 — 물건 등록 폼 (물건번호 + 담당자 구분값). 담당자 역할에서만 보인다.
import { useId, useRef, useState, type FormEvent } from "react";
import { ApiClientError, callApi } from "@/lib/apiClient";
import type { CaseView } from "@/lib/caseView";
import type { Role } from "@/lib/role";
import { CASE_NO_MAX, OWNER_CODE_MAX } from "@/lib/validation";

const inputClass =
  "min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground " +
  "placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export default function CaseForm({
  role,
  onCreated,
}: {
  role: Role;
  onCreated: (created: CaseView) => void;
}) {
  const [caseNo, setCaseNo] = useState("");
  const [ownerCode, setOwnerCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const caseNoId = useId();
  const ownerCodeId = useId();
  // 등록한 뒤 이어서 다음 물건을 입력할 수 있게, 물건번호 칸으로 초점을 되돌린다
  const caseNoRef = useRef<HTMLInputElement>(null);
  // 등록에 성공한 시각. 더블클릭의 두 번째 클릭이 "물건번호를 입력해 주세요" 오류를 띄우지 않게 한다
  const lastSuccessAt = useRef(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    // 방금(1초 안에) 등록에 성공했다면 반복된 클릭으로 보고 조용히 무시한다
    if (Date.now() - lastSuccessAt.current < 1000) return;
    if (caseNo.trim() === "") {
      setError("물건번호를 입력해 주세요.");
      return;
    }
    if (ownerCode.trim() === "") {
      setError("담당자 구분값을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await callApi<CaseView>("/api/cases", {
        method: "POST",
        role,
        body: { caseNo, ownerCode },
      });
      onCreated(created);
      lastSuccessAt.current = Date.now();
      setCaseNo("");
      caseNoRef.current?.focus();
      // 같은 담당자가 이어서 등록하는 경우가 많아 구분값은 그대로 둔다
    } catch (err) {
      // 실패해도 입력한 값은 지우지 않는다
      setError(
        err instanceof ApiClientError
          ? err.message
          : "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="물건 등록"
      className="surface-card flex flex-col gap-3 p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={caseNoId} className="text-sm font-medium">
            물건번호
          </label>
          <input
            id={caseNoId}
            ref={caseNoRef}
            value={caseNo}
            onChange={(event) => setCaseNo(event.target.value)}
            maxLength={CASE_NO_MAX}
            autoComplete="off"
            placeholder="예: 샘플-001"
            className={inputClass}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={ownerCodeId} className="text-sm font-medium">
            담당자 구분값
          </label>
          <input
            id={ownerCodeId}
            value={ownerCode}
            onChange={(event) => setOwnerCode(event.target.value)}
            maxLength={OWNER_CODE_MAX}
            autoComplete="off"
            placeholder="예: 담당-01 (이름이 아닌 코드)"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          aria-disabled={submitting}
          className="min-h-11 rounded-md border border-foreground bg-foreground px-5 text-sm font-medium text-background transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground aria-disabled:opacity-60"
        >
          {submitting ? "등록 중..." : "등록"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger-fg">
          {error}
        </p>
      )}
    </form>
  );
}
