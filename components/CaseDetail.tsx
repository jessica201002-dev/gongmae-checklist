"use client";

// Design Ref: §7.1, §7.3, §7.4 — 물건 상세: 낙찰일·매각결정기일·기한 상태 + 매각결정 체크리스트 6개 항목.
// 담당자는 낙찰일을 입력하고 항목마다 미완료 / 완료 / 해당 없음을 고르며, 팀장·부점장은 읽기만 한다.
import { useId, useRef, useState, type Ref } from "react";
import OnbidLookup from "@/components/OnbidLookup";
import StatusBadge from "@/components/StatusBadge";
import { ApiClientError, callApi } from "@/lib/apiClient";
import type { CaseView } from "@/lib/caseView";
import { CHECKLIST_ITEMS, type ItemKey } from "@/lib/checklist";
import { formatYmdWithWeekday } from "@/lib/dateFormat";
import { canEdit, type Role } from "@/lib/role";
import type { ItemState } from "@/lib/types";
import { DELIVERY_REG_NO_MAX } from "@/lib/validation";

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

const GENERIC_ERROR = "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

// 날짜 칸은 연도를 6자리까지 받는 브라우저가 있어, 저장 전에 모양과 범위를 먼저 알려 준다.
const BID_DATE_MIN = "2000-01-01";
const BID_DATE_MAX = "2099-12-31";
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
  const bidInputId = useId();
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
          목록에서 물건을 선택하면 낙찰일과 체크리스트가 여기에 표시됩니다.
        </p>
      </section>
    );
  }

  const caseId = item.id;
  const incompleteCount = item.totalCount - item.completedCount;
  // 응답 순서에 따라 오래된 값이 덮어쓰지 않도록, 저장 중에는 다른 저장을 받지 않는다
  const busy = pending !== null || savingBid || savingRegNo;
  const bidDirty = draft !== (item.bidDate ?? "");
  const regNoDirty = regNoDraft.trim() !== (item.deliveryRegNo ?? "");
  const draftIssue = bidDateProblem(draft);
  const bidSaveBlocked = busy || !bidDirty || draftIssue !== null;
  const regNoSaveBlocked = busy || !regNoDirty;

  async function handleChange(itemKey: ItemKey, state: ItemState) {
    if (busy) return;
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
        role,
        body: { bidDate: next },
      });
      onUpdated(updated);
      setDraft(updated.bidDate ?? "");
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
        role,
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

      {/* 낙찰일 · 매각결정기일 · 기한 상태 */}
      <div className="flex flex-col gap-3 rounded-md bg-surface p-3">
        {editable ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={bidInputId} className="text-sm font-medium">
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
                  setBidNotice(null);
                  setBidError(null);
                }}
                aria-busy={savingBid}
                className="min-h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              />
              <button
                type="button"
                onClick={() => {
                  if (bidSaveBlocked) return;
                  saveBidDate(draft === "" ? null : draft);
                }}
                aria-disabled={bidSaveBlocked}
                className="min-h-11 rounded-md border border-foreground bg-foreground px-4 text-sm font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              >
                {savingBid ? "저장 중..." : "저장"}
              </button>
              {item.bidDate && (
                <button
                  type="button"
                  onClick={() => saveBidDate(null)}
                  aria-disabled={busy}
                  className="min-h-11 rounded-md border border-border bg-background px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                >
                  낙찰일 지우기
                </button>
              )}
            </div>
            {draftIssue && (
              <p role="alert" className="text-sm font-medium text-danger-fg">
                {draftIssue}
              </p>
            )}
            {bidError && (
              <p role="alert" className="text-sm font-medium text-danger-fg">
                {bidError}
              </p>
            )}
            <p aria-live="polite" className="min-h-4 text-xs text-muted">
              {bidNotice}
            </p>
            {/* Plan SC: FR-15~17 — 온비드 공개 정보 조회로 낙찰일을 채운다(저장은 담당자가 확인한 뒤) */}
            <OnbidLookup
              caseId={caseId}
              role={role}
              blocked={busy}
              bidDateAllowed={(ymd) => bidDateProblem(ymd) === null}
              onFill={(ymd) => {
                setDraft(ymd);
                setBidNotice(null);
                setBidError(null);
              }}
            />
          </div>
        ) : (
          <p className="text-sm">
            <span className="font-medium">낙찰일</span>{" "}
            {item.bidDate ? formatYmdWithWeekday(item.bidDate) : "아직 입력되지 않았습니다."}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">매각결정기일</span>
            {item.decisionDate ? (
              <>
                <strong>{formatYmdWithWeekday(item.decisionDate)}</strong>
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
            <p role="note" className="text-xs font-medium text-warn-fg">
              ※ 공휴일 목록(2026~2027년) 범위 밖이라 매각결정기일이 정확하지 않을 수 있습니다.
            </p>
          )}
          <p className="text-xs text-muted">
            낙찰일 다음 영업일부터 세어 7영업일째 날이며, 주말과 공휴일은 제외합니다.
            기일 2영업일 전부터 &ldquo;임박&rdquo;으로 표시합니다.
          </p>
        </div>
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
                      <label
                        key={option.label}
                        className={"cursor-pointer " + (busy ? "opacity-60" : "")}
                      >
                        <input
                          type="radio"
                          name={`${caseId}-${check.key}`}
                          checked={shown === option.value}
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
              {check.hasRegNoField &&
                (editable ? (
                  <div className="flex flex-col gap-2 border-t border-border pt-3">
                    <label htmlFor={regNoInputId} className="text-sm font-medium">
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
                        className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground read-only:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (regNoSaveBlocked) return;
                          saveRegNo(regNoDraft.trim() === "" ? null : regNoDraft.trim());
                        }}
                        aria-disabled={regNoSaveBlocked}
                        className="min-h-11 rounded-md border border-foreground bg-foreground px-4 text-sm font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                      >
                        {savingRegNo ? "저장 중..." : "저장"}
                      </button>
                      {item.deliveryRegNo && (
                        <button
                          type="button"
                          onClick={() => saveRegNo(null)}
                          aria-disabled={busy}
                          className="min-h-11 rounded-md border border-border bg-background px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                        >
                          등기번호 지우기
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted">
                      등기번호만 입력하세요. 이름·연락처 등 다른 개인정보는 함께 적지 마세요.
                    </p>
                    {regNoError && (
                      <p role="alert" className="text-sm font-medium text-danger-fg">
                        {regNoError}
                      </p>
                    )}
                    <p aria-live="polite" className="min-h-4 text-xs text-muted">
                      {regNoNotice}
                    </p>
                  </div>
                ) : (
                  <p className="border-t border-border pt-3 text-sm">
                    <span className="font-medium">송달 등기번호</span>{" "}
                    {item.deliveryRegNo ? (
                      <span className="break-all">{item.deliveryRegNo}</span>
                    ) : (
                      <span className="text-muted">입력된 등기번호가 없습니다.</span>
                    )}
                  </p>
                ))}
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
