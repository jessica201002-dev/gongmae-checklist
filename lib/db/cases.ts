// Design Ref: §3.3, §5, §6 — 표(cases, case_checks) 읽기·쓰기. 서버 코드(app/api)에서만 부른다.
import "server-only";
import { getSupabase } from "./supabase";
import { isCheckStatus, isItemKey, type ChecksByItem, type ItemKey } from "../checklist";
import type { CaseRecord, CheckStatus } from "../types";

type CaseRow = {
  id: string;
  case_no: string;
  owner_code: string;
  bid_date: string | null;
  delivery_reg_no: string | null;
  created_at: string;
  updated_at: string;
};

type CheckRow = { case_id: string; item_key: string; status: string };

/** 물건 + 항목 체크 상태 (계산한 값은 lib/caseView.ts에서 붙인다) */
export interface CaseWithChecks {
  record: CaseRecord;
  checks: ChecksByItem;
}

/** 같은 물건번호가 이미 있을 때 */
export class DuplicateCaseError extends Error {}
/** 없는 물건일 때 */
export class CaseNotFoundError extends Error {}

const UNIQUE_VIOLATION = "23505";

function toRecord(row: CaseRow): CaseRecord {
  return {
    id: row.id,
    caseNo: row.case_no,
    ownerCode: row.owner_code,
    bidDate: row.bid_date,
    deliveryRegNo: row.delivery_reg_no,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toChecks(rows: CheckRow[]): ChecksByItem {
  const checks: ChecksByItem = {};
  for (const row of rows) {
    if (isItemKey(row.item_key) && isCheckStatus(row.status)) {
      checks[row.item_key] = row.status;
    }
  }
  return checks;
}

/** 저장소 오류를 서버 기록용 오류로 바꿔 던진다 (화면에는 일반 오류 문구만 나간다) */
function storageError(error: { message: string; code?: string }): never {
  throw new Error(`저장소 오류(${error.code ?? "?"}): ${error.message}`);
}

/** 물건 목록 (등록 순). ownerCode를 주면 그 구분값의 물건만 */
export async function listCases(ownerCode?: string): Promise<CaseWithChecks[]> {
  const db = getSupabase();
  let query = db
    .from("cases")
    .select("*")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (ownerCode) query = query.eq("owner_code", ownerCode);
  const { data, error } = await query;
  if (error) storageError(error);
  const rows = (data ?? []) as CaseRow[];
  if (rows.length === 0) return [];

  const { data: checkData, error: checkError } = await db
    .from("case_checks")
    .select("case_id, item_key, status")
    .in("case_id", rows.map((row) => row.id));
  if (checkError) storageError(checkError);
  const checkRows = (checkData ?? []) as CheckRow[];

  return rows.map((row) => ({
    record: toRecord(row),
    checks: toChecks(checkRows.filter((check) => check.case_id === row.id)),
  }));
}

/** 물건 한 건. 없으면 null */
export async function getCase(id: string): Promise<CaseWithChecks | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from("cases")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) storageError(error);
  if (!data) return null;

  const { data: checkData, error: checkError } = await db
    .from("case_checks")
    .select("case_id, item_key, status")
    .eq("case_id", id);
  if (checkError) storageError(checkError);
  return {
    record: toRecord(data as CaseRow),
    checks: toChecks((checkData ?? []) as CheckRow[]),
  };
}

/** 물건 등록. 같은 물건번호가 있으면 DuplicateCaseError */
export async function createCase(
  caseNo: string,
  ownerCode: string,
): Promise<CaseWithChecks> {
  const { data, error } = await getSupabase()
    .from("cases")
    .insert({ case_no: caseNo, owner_code: ownerCode })
    .select("*")
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new DuplicateCaseError("이미 등록된 물건번호입니다.");
    }
    storageError(error);
  }
  return { record: toRecord(data as CaseRow), checks: {} };
}

/** 낙찰일·등기번호 수정 (값이 null이면 지움). 없는 물건이면 CaseNotFoundError */
export async function updateCase(
  id: string,
  patch: { bidDate?: string | null; deliveryRegNo?: string | null },
): Promise<CaseWithChecks> {
  const update: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.bidDate !== undefined) update.bid_date = patch.bidDate;
  if (patch.deliveryRegNo !== undefined) {
    update.delivery_reg_no = patch.deliveryRegNo;
  }
  const { data, error } = await getSupabase()
    .from("cases")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) storageError(error);
  if (!data) throw new CaseNotFoundError("없는 물건입니다.");
  const result = await getCase(id);
  if (!result) throw new CaseNotFoundError("없는 물건입니다.");
  return result;
}

/** 물건 삭제 (항목 체크도 함께 삭제된다). 지웠으면 true, 없는 물건이면 false */
export async function deleteCase(id: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("cases")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) storageError(error);
  return (data ?? []).length > 0;
}

/** 항목 하나 저장. status가 null이면 미완료로 되돌린다(행 삭제). 없는 물건이면 CaseNotFoundError */
export async function setCheck(
  id: string,
  itemKey: ItemKey,
  status: CheckStatus | null,
): Promise<CaseWithChecks> {
  const db = getSupabase();
  const { data: exists, error: existsError } = await db
    .from("cases")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (existsError) storageError(existsError);
  if (!exists) throw new CaseNotFoundError("없는 물건입니다.");

  if (status === null) {
    const { error } = await db
      .from("case_checks")
      .delete()
      .eq("case_id", id)
      .eq("item_key", itemKey);
    if (error) storageError(error);
  } else {
    const { error } = await db
      .from("case_checks")
      .upsert(
        { case_id: id, item_key: itemKey, status },
        { onConflict: "case_id,item_key" },
      );
    if (error) storageError(error);
  }

  const { error: touchError } = await db
    .from("cases")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);
  if (touchError) storageError(touchError);

  const result = await getCase(id);
  if (!result) throw new CaseNotFoundError("없는 물건입니다.");
  return result;
}
