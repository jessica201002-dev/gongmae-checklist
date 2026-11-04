"use client";

// Design Ref: §7.1, §7.3, §7.4 — 물건 목록. 담당자에게는 등록 폼과 삭제 버튼이 보이고,
// 팀장·부점장에게는 목록만 보인다(열람 전용). 등록 순으로 보여 준다.
import { useEffect, useState } from "react";
import CaseForm from "@/components/CaseForm";
import StatusBadge from "@/components/StatusBadge";
import { ApiClientError, callApi } from "@/lib/apiClient";
import type { CaseView } from "@/lib/caseView";
import { formatYmdWithWeekday } from "@/lib/dateFormat";
import { canEdit } from "@/lib/role";
import { useRole } from "@/lib/useRole";

export default function CaseList() {
  const role = useRole();
  const editable = canEdit(role);
  // null이면 아직 불러오는 중
  const [cases, setCases] = useState<CaseView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await callApi<CaseView[]>("/api/cases");
        if (!cancelled) setCases(data);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiClientError
              ? err.message
              : "물건 목록을 불러오지 못했습니다.",
          );
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setLoadError(null);
    setCases(null);
    setReloadKey((key) => key + 1);
  }

  function handleCreated(created: CaseView) {
    setCases((prev) => [...(prev ?? []), created]);
    setActionError(null);
    setNotice(`${created.caseNo} 물건을 등록했습니다.`);
  }

  async function handleDelete(item: CaseView) {
    const confirmed = window.confirm(
      `물건 "${item.caseNo}"을(를) 삭제할까요?\n체크한 내용도 함께 삭제되며 되돌릴 수 없습니다.`,
    );
    if (!confirmed) return;
    setDeletingId(item.id);
    setActionError(null);
    setNotice(null);
    try {
      await callApi<{ id: string }>(`/api/cases/${item.id}`, {
        method: "DELETE",
        role,
      });
      setCases((prev) => (prev ?? []).filter((c) => c.id !== item.id));
      setNotice(`${item.caseNo} 물건을 삭제했습니다.`);
    } catch (err) {
      setActionError(
        err instanceof ApiClientError
          ? err.message
          : "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {editable && <CaseForm role={role} onCreated={handleCreated} />}

      <p aria-live="polite" className="min-h-5 text-sm text-muted">
        {notice}
      </p>
      {actionError && (
        <p role="alert" className="text-sm font-medium text-danger-fg">
          {actionError}
        </p>
      )}

      {loadError ? (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p className="text-sm font-medium text-danger-fg">{loadError}</p>
          <button
            type="button"
            onClick={retry}
            className="min-h-11 rounded-md border border-border px-4 text-sm font-medium hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            다시 시도
          </button>
        </div>
      ) : cases === null ? (
        <p className="text-sm text-muted">물건 목록을 불러오는 중입니다...</p>
      ) : cases.length === 0 ? (
        <p className="text-sm text-muted">
          등록된 물건이 없습니다.
          {editable ? " 위 폼에서 물건번호를 등록해 주세요." : ""}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cases.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-base">{item.caseNo}</strong>
                  <span className="rounded bg-surface px-2 py-0.5 text-xs text-muted">
                    구분값 {item.ownerCode}
                  </span>
                  <StatusBadge status={item.deadlineStatus} />
                  {item.isComplete && (
                    <span className="text-xs font-semibold text-ok-fg">
                      매각결정 완료
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted">
                  체크 {item.completedCount}/{item.totalCount} ·{" "}
                  {item.decisionDate
                    ? `매각결정기일 ${formatYmdWithWeekday(item.decisionDate)}`
                    : "낙찰일 미입력"}
                </p>
                {item.holidayRangeWarning && (
                  <p className="text-xs text-warn-fg">
                    ※ 공휴일 목록 범위 밖이라 매각결정기일이 정확하지 않을 수 있습니다.
                  </p>
                )}
              </div>
              {editable && (
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  aria-label={`${item.caseNo} 물건 삭제`}
                  className="min-h-11 self-start rounded-md border border-border px-4 text-sm font-medium text-danger-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-60 sm:self-center"
                >
                  {deletingId === item.id ? "삭제 중..." : "삭제"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
