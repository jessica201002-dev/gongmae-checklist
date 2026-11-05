"use client";

// Design Ref: §7.1 — 물건 목록(왼쪽)과 물건 상세(오른쪽, 좁은 화면에서는 아래)를 묶는 화면.
// 목록 데이터와 선택한 물건을 여기서 한 번만 들고 있고, 목록·상세는 이 값을 받아 그린다.
import { useEffect, useRef, useState } from "react";
import CaseDetail from "@/components/CaseDetail";
import CaseForm from "@/components/CaseForm";
import CaseList from "@/components/CaseList";
import OwnerFilter from "@/components/OwnerFilter";
import OwnerSummary from "@/components/OwnerSummary";
import ScanLoader from "@/components/ScanLoader";
import SummaryCards from "@/components/SummaryCards";
import { ApiClientError, callApi } from "@/lib/apiClient";
import type { CaseView } from "@/lib/caseView";
import { filterByOwner, listOwnerCodes, sortForReview } from "@/lib/reviewList";
import { canEdit } from "@/lib/role";
import { useSession } from "@/lib/useSession";

export default function CaseBoard() {
  // 역할은 로그인한 계정에 정해져 있다. (로그인 확인은 바깥의 AuthGate가 하고, 확인되기 전에는 가장 낮은 권한으로 본다)
  const session = useSession();
  const user = session.status === "authed" ? session.user : null;
  const role = user?.role ?? "manager";
  const editable = canEdit(role);
  // null이면 아직 불러오는 중
  const [cases, setCases] = useState<CaseView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 담당자 구분값으로 걸러 보기 (빈 문자열 = 전체)
  const [ownerFilter, setOwnerFilter] = useState("");
  // 물건을 눌렀을 때 상세 제목으로 초점을 옮겨(좁은 화면에서는 스크롤도 따라간다) 키보드·화면 낭독 사용자도 바뀐 것을 알 수 있게 한다
  const [focusRequest, setFocusRequest] = useState(0);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  // 삭제하면 누른 버튼이 사라지므로, 결과 안내 문구로 초점을 옮겨 키보드 사용자가 위치를 잃지 않게 한다
  const noticeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await callApi<CaseView[]>("/api/cases");
        if (!cancelled) {
          setCases(data);
          // 새로고침 버튼으로 다시 불러온 경우에만 결과를 알린다 (처음 불러올 때는 알리지 않는다)
          if (reloadKey > 0) setNotice("목록을 새로 불러왔습니다.");
        }
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
      });
      setCases((prev) => (prev ?? []).filter((c) => c.id !== item.id));
      setSelectedId((current) => (current === item.id ? null : current));
      setNotice(`${item.caseNo} 물건을 삭제했습니다.`);
      noticeRef.current?.focus();
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

  /** 걸러 보는 구분값을 바꾼다. 걸러져서 목록에서 사라지는 물건이 상세에 남아 있지 않게 선택을 풀어 준다 */
  function handleOwnerFilter(owner: string) {
    setOwnerFilter(owner);
    setSelectedId((current) => {
      if (!current || owner === "") return current;
      const currentCase = cases?.find((item) => item.id === current);
      return currentCase?.ownerCode === owner ? current : null;
    });
  }

  const selected = cases?.find((item) => item.id === selectedId) ?? null;
  const ownerCodes = listOwnerCodes(cases ?? []);
  // 마지막 물건을 지우는 등으로 고른 구분값이 목록에서 사라지면 전체로 본다
  const activeOwner = ownerCodes.includes(ownerFilter) ? ownerFilter : "";
  // 담당자는 등록 순, 팀장·부점장은 "검토 필요"가 먼저 오는 정렬
  const filtered = filterByOwner(cases ?? [], activeOwner);
  const visibleCases = editable ? filtered : sortForReview(filtered);

  return (
    <div className="flex flex-col gap-4">
      {editable && user?.ownerCode && (
        <CaseForm ownerCode={user.ownerCode} onCreated={handleCreated} />
      )}
      {editable && !user?.ownerCode && (
        <p role="alert" className="text-sm font-medium text-danger-fg">
          계정에 담당자 구분값이 없어 물건을 보거나 등록할 수 없습니다. 관리자에게 문의해 주세요.
        </p>
      )}

      <p
        ref={noticeRef}
        tabIndex={-1}
        aria-live="polite"
        className="min-h-5 text-sm text-muted outline-none"
      >
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
        <ScanLoader message="물건 목록을 불러오는 중입니다..." />
      ) : (
        <div className="flex flex-col gap-4">
        {/* 팀장·부점장: 구분값별 진행 현황 요약 (담당자 화면에는 보이지 않는다) */}
        {/* 담당자: 내 구분값의 물건만 센 진행 현황 (서버가 내 물건만 돌려준다) / 팀장·부점장: 전체 현황 */}
        {user && (
          <SummaryCards cases={cases} title={editable ? "내 진행 현황" : "전체 진행 현황"} />
        )}
        {!editable && <OwnerSummary cases={cases} />}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {!editable && cases.length > 0 ? (
            <OwnerFilter
              owners={ownerCodes}
              value={activeOwner}
              onChange={handleOwnerFilter}
            />
          ) : (
            <span />
          )}
          {/* 다른 사람이 바꾼 내용이나 날짜가 바뀐 뒤의 기한 상태를 다시 불러온다 */}
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="min-h-11 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            목록 새로고침
          </button>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <CaseList
            cases={visibleCases}
            selectedId={selectedId}
            editable={editable}
            showReviewBadge={!editable}
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
        </div>
      )}
    </div>
  );
}
