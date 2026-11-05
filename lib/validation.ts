// Design Ref: §6 — 서버 API가 받은 입력을 검사하는 규칙. (표의 길이 제한과 같게 맞춘다: supabase/schema.sql)
import { isValidYmd } from "./businessDays";
import { isCheckStatus, isItemKey, type ItemKey } from "./checklist";
import type { CheckStatus } from "./types";

export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export const CASE_NO_MAX = 50;
export const OWNER_CODE_MAX = 20;
export const DELIVERY_REG_NO_MAX = 30;

// 낙찰일로 받을 수 있는 범위. 화면의 날짜 칸과 서버가 같은 값을 쓴다.
// (서버에서도 막지 않으면 API로 보낸 엉뚱한 연도가 기일 계산을 깨뜨려 목록 전체가 오류가 난다)
export const BID_DATE_MIN = "2000-01-01";
export const BID_DATE_MAX = "2099-12-31";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 줄바꿈·탭 같은 제어 문자
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** 물건 id 형식(uuid)인지 */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function validateText(
  value: unknown,
  label: string,
  max: number,
): Validated<string> {
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, message: `${label}을(를) 입력해 주세요.` };
  }
  const text = value.trim();
  if (text.length > max) {
    return { ok: false, message: `${label}은(는) ${max}자 이내로 입력해 주세요.` };
  }
  if (CONTROL_CHARS.test(text)) {
    return { ok: false, message: `${label}에 사용할 수 없는 문자가 들어 있습니다.` };
  }
  return { ok: true, value: text };
}

export function validateCaseNo(value: unknown): Validated<string> {
  return validateText(value, "물건번호", CASE_NO_MAX);
}

export function validateOwnerCode(value: unknown): Validated<string> {
  return validateText(value, "담당자 구분값", OWNER_CODE_MAX);
}

/** 낙찰일: 비우면(null 또는 빈 문자열) 지우기, 값이 있으면 "YYYY-MM-DD" 형식의 실제 날짜여야 한다 */
export function validateBidDate(value: unknown): Validated<string | null> {
  if (value === null || value === "") return { ok: true, value: null };
  if (typeof value === "string" && isValidYmd(value)) {
    // "YYYY-MM-DD" 문자열은 사전순 비교가 날짜순과 같다
    if (value < BID_DATE_MIN || value > BID_DATE_MAX) {
      return {
        ok: false,
        message: "낙찰일은 2000년부터 2099년 사이로 입력해 주세요.",
      };
    }
    return { ok: true, value };
  }
  return {
    ok: false,
    message: "낙찰일은 YYYY-MM-DD 형식의 올바른 날짜여야 합니다.",
  };
}

/** 송달 등기번호: 비우면 지우기, 값이 있으면 30자 이내 */
export function validateDeliveryRegNo(
  value: unknown,
): Validated<string | null> {
  if (value === null || value === "") return { ok: true, value: null };
  if (typeof value === "string" && value.trim() === "") {
    return { ok: true, value: null };
  }
  return validateText(value, "등기번호", DELIVERY_REG_NO_MAX);
}

/** 항목 체크 요청: itemKey는 6개 중 하나, status는 "done" | "na" | null(미완료) */
export function validateCheckInput(
  body: Record<string, unknown>,
): Validated<{ itemKey: ItemKey; status: CheckStatus | null }> {
  if (!isItemKey(body.itemKey)) {
    return { ok: false, message: "알 수 없는 체크 항목입니다." };
  }
  if (body.status !== null && !isCheckStatus(body.status)) {
    return {
      ok: false,
      message: '상태는 "done"(완료), "na"(해당 없음), null(미완료) 중 하나여야 합니다.',
    };
  }
  return { ok: true, value: { itemKey: body.itemKey, status: body.status } };
}
