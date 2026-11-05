"use client";

// Design Ref: §7.1, §7.3, §7.4 — 물건 상세: 낙찰일·매각결정기일·기한 상태 + 매각결정 체크리스트 6개 항목.
// 담당자는 낙찰일을 입력하고 항목마다 미완료 / 완료 / 해당 없음을 고르며, 팀장·부점장은 읽기만 한다.
// 디자인: 구역마다 흰 카드로 나누고(큰 회색 상자 안에 또 회색 상자를 두지 않는다), 공통 부품(.btn .field .seg .progress)을 쓴다.
import { useId, useRef, useState, type Ref } from "react";
import OnbidLookup from "@/components/OnbidLookup";
import StatusBadge from "@/components/StatusBadge";
import { ApiClientError, callApi } from "@/lib/apiClient";
import type { CaseView } from "@/lib/caseView";
import { CHECKLIST_ITEMS, type ItemKey } from "@/lib/checklist";
import { CONFIRM_LEVELS, confirmLevelOfRole, confirmStateOf } from "@/lib/confirmation";
import { formatDateSeoul, formatYmdWithWeekday } from "@/lib/dateFormat";
import { canEdit, type Role } from "@/lib/role";
import type { ItemState } from "@/lib/types";
import { BID_DATE_MAX, BID_DATE_MIN, DELIVERY_REG_NO_MAX } from "@/lib/validation";

const OPTIONS: { value: ItemState; label: string; variant: "none" | "done" | "na" }[] = [
  { value: null, label: "미완료", variant: "none" },
  { value: "done", label: "완료", variant: "done" },
  { value: "na", label: "해당 없음", variant: "na" },
];

function stateLabel(state: ItemState | undefined): string {
  if (state === "done") return "완료";
  if (state === "na") return "해당 없음";
  return "미완료";
}

const GENERIC_ERROR = "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

// 날짜 칸은 연도를 6자리까지 받는 브라우저가 있어, 저장 전에 모양과 범위를 먼저 알려 준다.
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 입력 중인 낙찰일에 문제가 있으면 안내 문구를, 없으면(비운 경우 포함) null */
function bidDateProblem(draft: string): string | null {
  if (draft === "") return null;
  if (!DATE_PATTERN.test(draft)) return "연도는 4자리로 입력해 주세요.";
  if (draft < BID_DATE_MIN || draft > BID_DATE_MAX) {
    return "낙찰일은 2000년부터 2099년 사이로 입력해 주세요.";
  }
  return null;
}

const ERROR_TEXT = "text-[13px] font-semibold text-danger-fg";

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
  // 낙찰일: 입력 중인 값("YYYY-MM-DD" 또는 빈 문자열)과 저장 상태
  const [draft, setDraft] = useState(item?.bidDate ?? "");
  const [savingBid, setSavingBid] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidNotice, setBidNotice] = useState<string | null>(null);
  // 날짜 칸에 일부만 입력한 상태. 이때 브라우저는 값을 빈 문자열로 알려 주므로, 그대로 저장하면 낙찰일이 지워진다
  const [bidBadInput, setBidBadInput] = useState(false);
  const bidInputId = useId();
  // 결재선 확인(담당자 → 팀장) 저장 상태
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmNotice, setConfirmNotice] = useState<string | null>(null);
  // 송달 등기번호: 입력 중인 값과 저장 상태 (Design Ref: §7.4 — 송달 여부 확인 항목의 등기번호 입력란)
  const [regNoDraft, setRegNoDraft] = useState(item?.deliveryRegNo ?? "");
  const [savingRegNo, setSavingRegNo] = useState(false);
  const [regNoError, setRegNoError] = useState<string | null>(null);
  const [regNoNotice, setRegNoNotice] = useState<string | null>(null);
  const regNoInputId = useId();
  // 저장 중에는 입력칸·버튼을 disabled로 막지 않는다. disabled가 되면 키보드 초점이 사라지기 때문이다.
  // 대신 눌러도 무시하고(aria-disabled), 값을 지워서 버튼이 사라질 때는 입력칸으로 초점을 옮긴다.
  const bidInputRef = useRef<HTMLInputElement>(null);
  const regNoInputRef = useRef<HTMLInputElement>(null);
  const editable = canEdit(role);

  if (!item) {
    return (
      <section
        aria-labelledby="case-detail-title"
        className="surface-card flex flex-col gap-1 border-dashed p-5"
      >
        <h3
          id="case-detail-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-bold tracking-tight outline-none"
        >
          체크리스트
        </h3>
        <p className="text-sm text-muted">
          목록에서 물건을 선택하면 낙찰일과 체크리스트가 여기에 표시됩니다.
        </p>
      </section>
    );
  }

  const caseId = item.id;
  const incompleteCount = item.totalCount - item.completedCount;
  const percent = item.totalCount > 0 ? (item.completedCount / item.totalCount) * 100 : 0;
  // 응답 순서에 따라 오래된 값이 덮어쓰지 않도록, 저장 중에는 다른 저장을 받지 않는다
  const busy = pending !== null || savingBid || savingRegNo || confirming;
  const myLevel = confirmLevelOfRole(role);
  const confirmState = confirmStateOf(item);
  const bidDirty = draft !== (item.bidDate ?? "");
  const regNoDirty = regNoDraft.trim() !== (item.deliveryRegNo ?? "");
  const draftIssue = bidBadInput
    ? "날짜를 끝까지 입력해 주세요. 낙찰일을 지우려면 \"낙찰일 지우기\"를 누르세요."
    : bidDateProblem(draft);
  const bidSaveBlocked = busy || !bidDirty || draftIssue !== null;
  const regNoSaveBlocked = busy || !regNoDirty;

  async function handleChange(itemKey: ItemKey, state: ItemState) {
    if (busy) return;
    setPending({ key: itemKey, state });
    setError(null);
    try {
      const updated = await callApi<CaseView>(`/api/cases/${caseId}/checks`, {
        method: "PUT",
        body: { itemKey, status: state },
      });
      onUpdated(updated);
    } catch (err) {
      // 저장하지 못하면 화면은 서버에 저장된 값으로 되돌아간다
      setError({
        key: itemKey,
        message: err instanceof ApiClientError ? err.message : GENERIC_ERROR,
      });
    } finally {
      setPending(null);
    }
  }

  // Plan SC: FR-04, FR-05 — 낙찰일을 저장하면 서버가 7영업일 뒤 매각결정기일과 기한 상태를 계산해 돌려준다.
  /** 낙찰일 저장. next가 null이면 낙찰일을 지운다 */
  async function saveBidDate(next: string | null) {
    if (busy) return;
    setSavingBid(true);
    setBidError(null);
    setBidNotice(null);
    try {
      const updated = await callApi<CaseView>(`/api/cases/${caseId}`, {
        method: "PATCH",
        body: { bidDate: next },
      });
      onUpdated(updated);
      setDraft(updated.bidDate ?? "");
      setBidBadInput(false);
      setBidNotice(next ? "낙찰일을 저장했습니다." : "낙찰일을 지웠습니다.");
      // "낙찰일 지우기" 버튼이 사라지므로, 이어서 입력할 수 있게 입력칸으로 초점을 옮긴다
      if (next === null) bidInputRef.current?.focus();
    } catch (err) {
      // 저장하지 못해도 입력한 값은 그대로 둔다
      setBidError(err instanceof ApiClientError ? err.message : GENERIC_ERROR);
    } finally {
      setSavingBid(false);
    }
  }

  /** 송달 등기번호 저장. next가 null이면 지운다 */
  async function saveRegNo(next: string | null) {
    if (busy) return;
    setSavingRegNo(true);
    setRegNoError(null);
    setRegNoNotice(null);
    try {
      const updated = await callApi<CaseView>(`/api/cases/${caseId}`, {
        method: "PATCH",
        body: { deliveryRegNo: next },
      });
      onUpdated(updated);
      setRegNoDraft(updated.deliveryRegNo ?? "");
      setRegNoNotice(next ? "등기번호를 저장했습니다." : "등기번호를 지웠습니다.");
      // "등기번호 지우기" 버튼이 사라지므로, 이어서 입력할 수 있게 입력칸으로 초점을 옮긴다
      if (next === null) regNoInputRef.current?.focus();
    } catch (err) {
      // 저장하지 못해도 입력한 값은 그대로 둔다
      setRegNoError(err instanceof ApiClientError ? err.message : GENERIC_ERROR);
    } finally {
      setSavingRegNo(false);
    }
  }

  /** 결재선 확인 표시를 남기거나(confirmed=true) 취소한다. 내 역할의 단계만 서버가 받아 준다 */
  async function handleConfirm(confirmed: boolean) {
    if (busy || !myLevel) return;
    // 담당자 확인을 취소하면 이미 남은 팀장 확인도 함께 취소되므로, 먼저 한 번 묻는다
    if (!confirmed && myLevel === "staff" && confirmState.manager) {
      const ok = window.confirm("담당자 확인을 취소하면 팀장 확인도 함께 취소됩니다. 계속할까요?");
      if (!ok) return;
    }
    setConfirming(true);
    setConfirmError(null);
    setConfirmNotice(null);
    try {
      const updated = await callApi<CaseView>(`/api/cases/${caseId}/confirm`, {
        method: "PUT",
        body: { level: myLevel, confirmed },
      });
      onUpdated(updated);
      const who = myLevel === "staff" ? "담당자" : "팀장";
      setConfirmNotice(confirmed ? `${who} 확인을 남겼습니다.` : `${who} 확인을 취소했습니다.`);
    } catch (err) {
      setConfirmError(err instanceof ApiClientError ? err.message : GENERIC_ERROR);
    } finally {
      setConfirming(false);
    }
  }

  const myConfirmed = myLevel ? confirmState[myLevel] : false;
  // 팀장은 담당자 확인이 있어야 확인할 수 있다 (결재선 순서)
  const managerWaiting = myLevel === "manager" && !confirmState.staff && !confirmState.manager;

  return (
    <section
      aria-labelledby="case-detail-title"
      className="surface-card accent-top flex flex-col gap-5 p-5 pt-6"
    >
      {/* 머리글: 작은 윗글 + 제목 + 담당자 구분값 */}
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold tracking-[0.16em] text-muted">매각결정 체크리스트</p>
        <h3
          id="case-detail-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-[22px] font-bold leading-tight tracking-tight outline-none"
        >
          {item.caseNo} 체크리스트
        </h3>
        <p className="text-[13px] text-muted">구분값 {item.ownerCode}</p>
      </header>

      {/* 결재선 확인 현황: 담당자 → 팀장 → 부점장. 담당자·팀장은 자기 단계만 남기고, 부점장은 열람만 한다 */}
      <div className="sub-panel">
        <h4 className="section-title">결재선 확인 현황</h4>
        <ol className="confirm-flow">
          {CONFIRM_LEVELS.map((level, index) => {
            const done = confirmState[level.key];
            const at = level.key === "staff" ? item.staffConfirmedAt : item.managerConfirmedAt;
            const by = level.key === "staff" ? item.staffConfirmedBy : item.managerConfirmedBy;
            return (
              <li key={level.key} className="confirm-step" data-state={done ? "done" : "todo"}>
                <span className="confirm-dot" aria-hidden="true">
                  {done ? "✓" : index + 1}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[13px] font-semibold">{level.label}</span>
                  <span className="text-xs text-muted">
                    {done && at ? `확인 ${formatDateSeoul(at)}${by ? ` · ${by}` : ""}` : "미확인"}
                  </span>
                </span>
              </li>
            );
          })}
          <li className="confirm-step" data-state="view">
            <span className="confirm-dot" aria-hidden="true">
              3
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold">부점장</span>
              <span className="text-xs text-muted">열람 · 결재는 앱 밖</span>
            </span>
          </li>
        </ol>
        {myLevel ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (managerWaiting) return;
                  void handleConfirm(!myConfirmed);
                }}
                aria-disabled={busy || managerWaiting}
                className={"btn " + (myConfirmed ? "btn-secondary" : "btn-primary")}
              >
                {confirming
                  ? "저장 중..."
                  : `${CONFIRM_LEVELS.find((l) => l.key === myLevel)?.label} 확인${myConfirmed ? " 취소" : ""}`}
              </button>
              {managerWaiting && (
                <span className="field-hint">담당자 확인이 있어야 팀장 확인을 남길 수 있습니다.</span>
              )}
            </div>
            {confirmError && (
              <p role="alert" className={ERROR_TEXT}>
                {confirmError}
              </p>
            )}
            <p aria-live="polite" className="min-h-4 text-xs text-muted">
              {confirmNotice}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted">
            부점장은 담당자·팀장의 확인 현황을 열람만 합니다. 결재 처리는 앱 밖에서 진행합니다.
          </p>
        )}
      </div>

      {/* 낙찰일 · 매각결정기일 · 기한 상태 (논리 묶음별로 나눈 흰 구역) */}
      <div className="flex flex-col gap-3">
        <div className="sub-panel">
          <h4 className="section-title">낙찰일</h4>
          {editable ? (
            <div className="flex flex-col gap-2">
              {/* 구역 제목이 같은 말을 보여 주므로, 입력칸의 이름표는 화면 낭독기용으로만 둔다 */}
              <label htmlFor={bidInputId} className="sr-only">
                낙찰일
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id={bidInputId}
                  type="date"
                  min={BID_DATE_MIN}
                  max={BID_DATE_MAX}
                  ref={bidInputRef}
                  value={draft}
                  onChange={(event) => {
                    if (busy) return;
                    setDraft(event.target.value);
                    setBidBadInput(event.target.validity.badInput);
                    setBidNotice(null);
                    setBidError(null);
                  }}
                  aria-busy={savingBid}
                  aria-invalid={draftIssue !== null}
                  className="field w-auto min-w-44"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (bidSaveBlocked) return;
                    saveBidDate(draft === "" ? null : draft);
                  }}
                  aria-disabled={bidSaveBlocked}
                  className="btn btn-primary"
                >
                  {savingBid ? "저장 중..." : "저장"}
                </button>
                {item.bidDate && (
                  <button
                    type="button"
                    onClick={() => saveBidDate(null)}
                    aria-disabled={busy}
                    className="btn btn-secondary"
                  >
                    낙찰일 지우기
                  </button>
                )}
              </div>
              {draftIssue && (
                <p role="alert" className={ERROR_TEXT}>
                  {draftIssue}
                </p>
              )}
              {bidError && (
                <p role="alert" className={ERROR_TEXT}>
                  {bidError}
                </p>
              )}
              <p aria-live="polite" className="min-h-4 text-xs text-muted">
                {bidNotice}
              </p>
              {/* Plan SC: FR-15~17 — 온비드 공개 정보 조회로 낙찰일을 채운다(저장은 담당자가 확인한 뒤) */}
              <OnbidLookup
                caseId={caseId}
                blocked={busy}
                bidDateAllowed={(ymd) => bidDateProblem(ymd) === null}
                onFill={(ymd) => {
                  setDraft(ymd);
                  setBidBadInput(false);
                  setBidNotice(null);
                  setBidError(null);
                }}
              />
            </div>
          ) : (
            <p className="text-sm">
              <span className="sr-only">낙찰일 </span>
              {item.bidDate ? formatYmdWithWeekday(item.bidDate) : "아직 입력되지 않았습니다."}
            </p>
          )}
        </div>

        <div className="sub-panel">
          <h4 className="section-title">매각결정기일</h4>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="sr-only">매각결정기일</span>
              {item.decisionDate ? (
                <>
                  <strong className="text-base">{formatYmdWithWeekday(item.decisionDate)}</strong>
                  <StatusBadge status={item.deadlineStatus} />
                </>
              ) : (
                <span className="text-muted">
                  {editable
                    ? "낙찰일을 입력해 주세요."
                    : "낙찰일이 입력되면 표시됩니다."}
                </span>
              )}
            </div>
            {item.decisionDate && item.isComplete && (
              <p className="text-xs text-muted">
                6개 항목이 모두 완료되어 기한 상태(&ldquo;임박&rdquo;, &ldquo;기일 경과&rdquo;)는 표시하지 않습니다.
              </p>
            )}
            {item.holidayRangeWarning && (
              <p role="note" className="text-xs font-semibold text-warn-fg">
                ※ 공휴일 목록(2026~2027년) 범위 밖이라 매각결정기일이 정확하지 않을 수 있습니다.
              </p>
            )}
            <p className="text-xs leading-relaxed text-muted">
              낙찰일 다음 영업일부터 세어 7영업일째 날이며, 주말과 공휴일은 제외합니다.
              기일 2영업일 전부터 &ldquo;임박&rdquo;으로 표시합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 진행 현황: 실제 완료 수와 전체 수 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between gap-3">
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
          <span aria-hidden="true" className="shrink-0 tabular-nums leading-none">
            <span className="text-[28px] font-bold tracking-tight">{item.completedCount}</span>
            <span className="text-sm font-semibold text-muted"> / {item.totalCount}</span>
          </span>
        </div>
        <div className={"progress " + (item.isComplete ? "progress-done" : "")} aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      <ul className="flex flex-col gap-2.5">
        {CHECKLIST_ITEMS.map((check) => {
          const saved = item.checks[check.key] ?? null;
          const shown = pending?.key === check.key ? pending.state : saved;
          const rowError = error?.key === check.key ? error.message : null;
          return (
            <li
              key={check.key}
              className="item-card"
              data-state={shown === "done" ? "done" : shown === "na" ? "na" : "none"}
            >
              {editable ? (
                <fieldset className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <legend className="sr-only">{check.label}</legend>
                    <span aria-hidden="true" className="text-[15px] font-semibold leading-snug">
                      {check.label}
                    </span>
                    <div className="seg" data-busy={busy}>
                      {OPTIONS.map((option) => (
                        <label key={option.label} className="seg-opt" data-variant={option.variant}>
                          <input
                            type="radio"
                            name={`${caseId}-${check.key}`}
                            checked={shown === option.value}
                            onChange={() => handleChange(check.key, option.value)}
                            className="sr-only"
                          />
                          <span>
                            {option.variant === "done" && (
                              <svg
                                className="icon seg-check"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M3 8.5l3.2 3.2L13 4.8" />
                              </svg>
                            )}
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {pending?.key === check.key && (
                    <p className="mt-1.5 text-xs text-muted">저장 중...</p>
                  )}
                </fieldset>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-semibold leading-snug">{check.label}</span>
                  <span
                    className={
                      "badge shrink-0 " +
                      (saved === "done"
                        ? "badge-ok"
                        : saved === "na"
                          ? "badge-review"
                          : "badge-chip")
                    }
                  >
                    {saved === "done" ? "✓ " : saved === "na" ? "– " : "○ "}
                    {stateLabel(saved)}
                  </span>
                </div>
              )}
              {check.hasRegNoField &&
                (editable ? (
                  <div className="flex flex-col gap-2 border-t border-line pt-3">
                    <label htmlFor={regNoInputId} className="field-label">
                      송달 등기번호
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        id={regNoInputId}
                        ref={regNoInputRef}
                        type="text"
                        value={regNoDraft}
                        onChange={(event) => {
                          setRegNoDraft(event.target.value);
                          setRegNoNotice(null);
                          setRegNoError(null);
                        }}
                        maxLength={DELIVERY_REG_NO_MAX}
                        autoComplete="off"
                        readOnly={busy}
                        placeholder={`등기번호 (최대 ${DELIVERY_REG_NO_MAX}자)`}
                        className="field min-w-0 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (regNoSaveBlocked) return;
                          saveRegNo(regNoDraft.trim() === "" ? null : regNoDraft.trim());
                        }}
                        aria-disabled={regNoSaveBlocked}
                        className="btn btn-primary"
                      >
                        {savingRegNo ? "저장 중..." : "저장"}
                      </button>
                      {item.deliveryRegNo && (
                        <button
                          type="button"
                          onClick={() => saveRegNo(null)}
                          aria-disabled={busy}
                          className="btn btn-secondary"
                        >
                          등기번호 지우기
                        </button>
                      )}
                    </div>
                    <p className="field-hint">
                      등기번호는 숫자와 하이픈(-)만 입력할 수 있습니다. 이름·연락처 등 다른 개인정보는 적지 마세요.
                    </p>
                    {regNoError && (
                      <p role="alert" className={ERROR_TEXT}>
                        {regNoError}
                      </p>
                    )}
                    <p aria-live="polite" className="min-h-4 text-xs text-muted">
                      {regNoNotice}
                    </p>
                  </div>
                ) : (
                  <p className="border-t border-line pt-3 text-sm">
                    <span className="font-semibold">송달 등기번호</span>{" "}
                    {item.deliveryRegNo ? (
                      <span className="break-all">{item.deliveryRegNo}</span>
                    ) : (
                      <span className="text-muted">입력된 등기번호가 없습니다.</span>
                    )}
                  </p>
                ))}
              {rowError && (
                <p role="alert" className={ERROR_TEXT}>
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
