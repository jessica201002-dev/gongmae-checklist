"use client";

// Design Ref: §7.1 — 물건 목록(왼쪽)과 물건 상세(오른쪽, 좁은 화면에서는 아래)를 묶는 화면.
// 목록 데이터와 선택한 물건을 여기서 한 번만 들고 있고, 목록·상세는 이 값을 받아 그린다.
import { useEffect, useRef, useState } from "react";
import CaseDetail from "@/components/CaseDetail";
import CaseForm from "@/components/CaseForm";
import CaseList from "@/components/CaseList";
import { ApiClientError, callApi } from "@/lib/apiClient";
import type { CaseView } from "@/lib/caseView";
import { canEdit } from "@/lib/role";
import { useRole } from "@/lib/useRole";

export default function CaseBoard() {
  const role = useRole();
  const editable = canEdit(role);
  // null이면 아직 불러오는 중
  const [cases, setCases] = useState<CaseView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 물건을 눌렀을 때 상세 제목으로 초점을 옮겨(좁은 화면에서는 스크롤도 따라간다) 키보드·화면 낭독 사용자도 바뀐 것을 알 수 있게 한다
  const [focusRequest, setFocusRequest] = useState(0);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);

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

  useEffect(() => {
    if (focusRequest > 0) detailHeadingRef.current?.focus();
  }, [focusRequest]);

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

  function handleSelect(id: string) {
    setSelectedId(id);
    setFocusRequest((n) => n + 1);
  }

  /** 상세에서 저장한 결과(완료 수, 기한 상태 등)를 목록에도 반영한다 */
  function handleUpdated(updated: CaseView) {
    setCases((prev) =>
      (prev ?? []).map((item) => (item.id === updated.id ? updated : item)),
    );
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
      setSelectedId((current) => (current === item.id ? null : current));
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

  const selected = cases?.find((item) => item.id === selectedId) ?? null;

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
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <CaseList
            cases={cases}
            selectedId={selectedId}
            editable={editable}
            deletingId={deletingId}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
          {/* key: 물건이나 역할이 바뀌면 상세의 저장 상태·오류 문구를 새로 시작한다 */}
          <CaseDetail
            key={`${selected?.id ?? "none"}:${editable ? "edit" : "view"}`}
            item={selected}
            role={role}
            headingRef={detailHeadingRef}
            onUpdated={handleUpdated}
          />
        </div>
      )}
    </div>
  );
}
