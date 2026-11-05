// Design Ref: §3.3, §6, §9 — 온비드 공개 정보 조회(단방향, 서버 전용).
// 공공데이터포털 "차세대 온비드 물건 입찰결과상세 조회서비스"를 물건번호로 호출해 읽어 오기만 한다.
// 앱의 내용은 보내지 않고(요청에는 물건번호와 인증키만 쓴다), 인증키는 .env에서만 읽어 응답·기록에 남기지 않는다.
import "server-only";

const ENDPOINT =
  "https://apis.data.go.kr/B010003/OnbidCltrBidRsltDtlSrvc2/getCltrBidRsltDtl2";
const TIMEOUT_MS = 8000;

import type { OnbidLookupResult, OnbidUnavailableReason } from "./onbidTypes";

export type { OnbidLookupResult, OnbidUnavailableReason };

// 응답 필드 대응표. 실제 응답을 받아 본 뒤 확정한다(작업 14).
// 인증키가 승인되기 전에는 응답 모양을 확인할 수 없어 비워 둔다. 비어 있으면 "mapping_pending"으로 처리한다.
const FIELD_MAP: {
  /** 낙찰일이 들어 있는 필드 이름 */
  bidDate?: string;
  /** 화면에 보여 줄 공개 항목: [온비드 필드 이름, 화면 이름표] */
  info: [string, string][];
} = { info: [] };

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 인증키 오류·한도 초과 등 포털 공통 오류 코드를 이유로 바꾼다 */
function reasonFromPortalCode(code: string): OnbidUnavailableReason {
  if (code === "30" || code === "31" || code === "32" || code === "33") {
    return "key_rejected";
  }
  if (code === "22") return "rate_limited";
  return "upstream_error";
}

/** 응답에서 물건 목록(item)을 꺼낸다. 한 건이면 객체, 여러 건이면 배열로 오는 경우를 모두 받는다 */
function extractItems(body: Json): Json[] {
  const items = body.items;
  const raw = isObject(items) && "item" in items ? items.item : items;
  if (Array.isArray(raw)) return raw.filter(isObject);
  if (isObject(raw)) return [raw];
  return [];
}

/** "20261105", "2026-11-05", "2026-11-05 10:00:00" 같은 값을 "YYYY-MM-DD"로 바꾼다. 알 수 없으면 null */
function toYmd(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})/);
  const dashed = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const m = dashed ?? compact;
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * 응답 본문(JSON)을 조회 결과로 바꾼다. 네트워크와 무관한 순수 함수라 따로 시험할 수 있다.
 * 개인을 알 수 있는 값이 있어도 FIELD_MAP에 적은 공개 항목만 꺼내므로 나머지는 버려진다.
 */
export function parseOnbidResponse(json: unknown): OnbidLookupResult {
  if (!isObject(json)) return { status: "unavailable", reason: "upstream_error" };

  // 포털 공통 오류 형식: { OpenAPI_ServiceResponse: { cmmMsgHeader: { returnReasonCode } } }
  const portal = json.OpenAPI_ServiceResponse;
  if (isObject(portal) && isObject(portal.cmmMsgHeader)) {
    const code = String(portal.cmmMsgHeader.returnReasonCode ?? "");
    return { status: "unavailable", reason: reasonFromPortalCode(code) };
  }

  const root = isObject(json.response) ? json.response : json;
  const header = isObject(root.header) ? root.header : null;
  const body = isObject(root.body) ? root.body : null;

  const resultCode = header ? String(header.resultCode ?? "") : "";
  if (header && resultCode !== "" && resultCode !== "00" && resultCode !== "0") {
    return { status: "unavailable", reason: reasonFromPortalCode(resultCode) };
  }
  if (!body) return { status: "unavailable", reason: "upstream_error" };

  const items = extractItems(body);
  if (items.length === 0) return { status: "not_found" };

  if (!FIELD_MAP.bidDate && FIELD_MAP.info.length === 0) {
    return { status: "unavailable", reason: "mapping_pending" };
  }

  const first = items[0];
  const bidDate = FIELD_MAP.bidDate ? toYmd(first[FIELD_MAP.bidDate]) : null;
  const info: { label: string; value: string }[] = [];
  for (const [field, label] of FIELD_MAP.info) {
    const value = first[field];
    if ((typeof value === "string" || typeof value === "number") && String(value).trim() !== "") {
      info.push({ label, value: String(value).trim() });
    }
  }
  return { status: "found", bidDate, info };
}

// 같은 물건번호를 반복 조회해도 온비드 호출 한도를 쓰지 않도록, 결과를 잠시 재사용한다.
// 조회 불가(오류) 결과는 재사용하지 않는다. 서버 한 개 안에서만 유지되므로 완전한 호출 제한은 아니다.
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map<string, { at: number; result: OnbidLookupResult }>();

/** 물건번호(= 온비드 물건관리번호)로 온비드 공개 정보를 조회한다. 읽기 전용(GET) */
export async function lookupOnbid(caseNo: string): Promise<OnbidLookupResult> {
  const hit = cache.get(caseNo);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;
  const result = await fetchOnbid(caseNo);
  if (result.status !== "unavailable") {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(caseNo, { at: Date.now(), result });
  }
  return result;
}

async function fetchOnbid(caseNo: string): Promise<OnbidLookupResult> {
  const key = process.env.ONBID_SERVICE_KEY;
  if (!key || key.trim() === "") return { status: "unavailable", reason: "no_key" };

  const params = new URLSearchParams({
    serviceKey: key.trim(),
    pageNo: "1",
    numOfRows: "10",
    resultType: "json",
    cltrMngNo: caseNo,
  });

  try {
    const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await response.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      // JSON이 아니면(예: XML 오류) 인증키 오류 문구가 들어 있는지만 본다
      if (/SERVICE_KEY|등록되지 않은/.test(text)) {
        return { status: "unavailable", reason: "key_rejected" };
      }
      return { status: "unavailable", reason: "upstream_error" };
    }
    return parseOnbidResponse(json);
  } catch (error) {
    // 오류 내용에 주소(인증키 포함)가 섞일 수 있어 자세한 내용은 남기지 않는다
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return { status: "unavailable", reason: "timeout" };
    }
    return { status: "unavailable", reason: "upstream_error" };
  }
}
