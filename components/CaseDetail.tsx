"use client";

// Design Ref: §7.1, §7.3, §7.4 — 물건 상세: 매각결정 체크리스트 6개 항목.
// 담당자는 항목마다 미완료 / 완료 / 해당 없음을 고르고, 팀장·부점장은 읽기만 한다.
import { useState, type Ref } from "react";
import { ApiClientError, callApi } from "@/lib/apiClient";
import type { CaseView } from "@/lib/caseView";
import { CHECKLIST_ITEMS, type ItemKey } from "@/lib/checklist";
import { canEdit, type Role } from "@/lib/role";
import type { ItemState } from "@/lib/types";

const OPTIONS: { value: ItemState; label: string }[] = [
  { value: null, label: "미완료" },
  { value: "done", label: "완료" },
  { value: "na", label: "해당 없음" },
];

function stateLabel(state: ItemState | undefined): string {
  if (state === "done") return "완료";
  if (state === "na") return "해당 없음";
  return "미완료";
}

export default function CaseDetail({
  item,
  role,
  headingRef,
  onUpdated,
}: {
  item: CaseView | null;
  role: Role;
  headingRef: Ref<HTMLHeadingElement>;
  onUpdated: (updated: CaseView) => void;
}) {
  // 저장 중인 항목과 고른 값. 저장이 끝나기 전에는 서버에 저장된 값 대신 이 값을 보여 준다
  const [pending, setPending] = useState<{ key: ItemKey; state: ItemState } | null>(null);
  const [error, setError] = useState<{ key: ItemKey; message: string } | null>(null);
  const editable = canEdit(role);

  if (!item) {
    return (
      <section
        aria-labelledby="case-detail-title"
        className="rounded-lg border border-dashed border-border p-4"
      >
        <h3
          id="case-detail-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-base font-semibold outline-none"
        >
          체크리스트
        </h3>
        <p className="mt-1 text-sm text-muted">
          목록에서 물건을 선택하면 체크리스트가 여기에 표시됩니다.
        </p>
      </section>
    );
  }

  const caseId = item.id;
  const incompleteCount = item.totalCount - item.completedCount;

  async function handleChange(itemKey: ItemKey, state: ItemState) {
    // 저장이 겹치면 응답 순서에 따라 오래된 값이 덮어쓸 수 있어, 저장 중에는 다른 선택을 받지 않는다
    if (pending) return;
    setPending({ key: itemKey, state });
    setError(null);
    try {
      const updated = await callApi<CaseView>(`/api/cases/${caseId}/checks`, {
        method: "PUT",
        role,
        body: { itemKey, status: state },
      });
      onUpdated(updated);
    } catch (err) {
      // 저장하지 못하면 화면은 서버에 저장된 값으로 되돌아간다
      setError({
        key: itemKey,
        message:
          err instanceof ApiClientError
            ? err.message
            : "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <section
      aria-labelledby="case-detail-title"
      className="flex flex-col gap-4 rounded-lg border border-border p-4"
    >
      <div className="flex flex-col gap-1">
        <h3
          id="case-detail-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-base font-semibold outline-none"
        >
          {item.caseNo} 체크리스트
        </h3>
        <p className="text-sm text-muted">구분값 {item.ownerCode}</p>
      </div>

      <div className="flex flex-col gap-2">
        <p
          aria-live="polite"
          className={
            "text-sm font-semibold " + (item.isComplete ? "text-ok-fg" : "text-foreground")
          }
        >
          {item.isComplete
            ? `매각결정 완료 (${item.completedCount}/${item.totalCount})`
            : `미완료 ${incompleteCount}개 (${item.completedCount}/${item.totalCount})`}
        </p>
        <div aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full bg-ok-fg transition-[width]"
            style={{ width: `${(item.completedCount / item.totalCount) * 100}%` }}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {CHECKLIST_ITEMS.map((check) => {
          const saved = item.checks[check.key] ?? null;
          const shown = pending?.key === check.key ? pending.state : saved;
          const rowError = error?.key === check.key ? error.message : null;
          return (
            <li key={check.key} className="flex flex-col gap-2 rounded-md bg-surface p-3">
              {editable ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-sm font-medium">{check.label}</legend>
                  <div className="flex flex-wrap gap-2">
                    {OPTIONS.map((option) => (
                      <label key={option.label} className="cursor-pointer">
                        <input
                          type="radio"
                          name={`${caseId}-${check.key}`}
                          checked={shown === option.value}
                          disabled={pending !== null}
                          onChange={() => handleChange(check.key, option.value)}
                          className="peer sr-only"
                        />
                        <span
                          className={
                            "inline-flex min-h-11 min-w-20 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors " +
                            "border-border bg-background text-foreground " +
                            "peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background " +
                            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foreground " +
                            "peer-disabled:opacity-60"
                          }
                        >
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {pending?.key === check.key && (
                    <p className="text-xs text-muted">저장 중...</p>
                  )}
                </fieldset>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{check.label}</span>
                  <span
                    className={
                      "shrink-0 text-sm font-semibold " +
                      (saved === null ? "text-muted" : "text-ok-fg")
                    }
                  >
                    {saved === "done" ? "✓ " : saved === "na" ? "– " : "○ "}
                    {stateLabel(saved)}
                  </span>
                </div>
              )}
              {rowError && (
                <p role="alert" className="text-sm font-medium text-danger-fg">
                  {rowError}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {!editable && (
        <p className="text-xs text-muted">
          팀장·부점장은 체크한 내용을 열람만 할 수 있습니다.
        </p>
      )}
    </section>
  );
}
