// Design Ref: §3.3, §6, §9 — 온비드 공개 정보 조회(단방향, 서버 전용).
// 공공데이터포털 "차세대 온비드 물건 입찰결과목록 조회서비스"를 물건번호(물건관리번호)로 호출해 읽어 오기만 한다.
// 앱의 내용은 보내지 않고(요청에는 물건번호·조회 기간·인증키만 쓴다), 인증키는 .env에서만 읽어 응답·기록에 남기지 않는다.
import "server-only";

const ENDPOINT =
  "https://apis.data.go.kr/B010003/OnbidCltrBidRsltListSrvc2/getCltrBidRsltList2";
const TIMEOUT_MS = 8000;
// 이 서비스의 필수 조건: 물건유형코드(0001), 재산유형코드(0007 = 압류재산), 개찰일 시작·종료(종료는 오늘까지만 가능)
const CLTR_TYPE_CD = "0001";
const PRPT_DIV_CD = "0007";
const LOOKBACK_YEARS = 3;

import { todayInSeoul } from "./deadline";
import { findOnbidSample } from "./onbidMock";
import type { OnbidLookupResult, OnbidUnavailableReason } from "./onbidTypes";

export type { OnbidLookupResult, OnbidUnavailableReason };

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

/** "20261029", "202610291100", "2026-10-29", "2026-10-29 10:00:00" 같은 값을 "YYYY-MM-DD"로 바꾼다. 알 수 없으면 null */
function toYmd(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})/);
  const dashed = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const m = dashed ?? compact;
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** 개찰일시 "202610291100" → "2026-10-29 11:00". 시각이 없으면 날짜만 */
function toYmdHm(value: unknown): string | null {
  const ymd = toYmd(value);
  if (!ymd) return null;
  const hm = String(value).trim().match(/^\d{8}(\d{2})(\d{2})/);
  return hm ? `${ymd} ${hm[1]}:${hm[2]}` : ymd;
}

function text(value: unknown): string | null {
  return (typeof value === "string" || typeof value === "number") && String(value).trim() !== ""
    ? String(value).trim()
    : null;
}

function won(value: unknown): string | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? `${n.toLocaleString("ko-KR")}원` : null;
}

/** 같은 물건번호의 여러 회차 중 보여 줄 한 건을 고른다: "낙찰" 건이 있으면 그중 가장 최근, 없으면 가장 최근 건 */
function pickItem(items: Json[]): Json {
  const byRecent = [...items].sort((a, b) =>
    String(b.cltrOpbdDt ?? "").localeCompare(String(a.cltrOpbdDt ?? "")),
  );
  return byRecent.find((it) => text(it.pbctStatNm) === "낙찰") ?? byRecent[0];
}

/**
 * 응답 본문(JSON)을 조회 결과로 바꾼다. 네트워크와 무관한 순수 함수라 따로 시험할 수 있다.
 * 화면에 보여 줄 공개 항목(물건명·용도·감정가·개찰일시·입찰 결과·회차)만 꺼내므로 나머지는 버려진다.
 * 낙찰일은 입찰 결과가 "낙찰"인 건의 개찰일만 쓴다. 유찰·취소 건은 낙찰일이 없는 것으로 본다.
 */
export function parseOnbidResponse(json: unknown, caseNo?: string): OnbidLookupResult {
  if (!isObject(json)) return { status: "unavailable", reason: "upstream_error" };

  // 포털 공통 오류 형식: { OpenAPI_ServiceResponse: { cmmMsgHeader: { returnReasonCode } } }
  const portal = json.OpenAPI_ServiceResponse;
  if (isObject(portal) && isObject(portal.cmmMsgHeader)) {
    const code = String(portal.cmmMsgHeader.returnReasonCode ?? "");
    return { status: "unavailable", reason: reasonFromPortalCode(code) };
  }

  // 결과 없음 형식: { result: { resultCode: "03", resultMsg: "NODATA_ERROR" } }
  if (isObject(json.result) && String(json.result.resultCode ?? "") === "03") {
    return { status: "not_found" };
  }

  const root = isObject(json.response) ? json.response : json;
  const header = isObject(root.header) ? root.header : null;
  const body = isObject(root.body) ? root.body : null;

  const resultCode = header ? String(header.resultCode ?? "") : "";
  if (header && resultCode === "03") return { status: "not_found" };
  if (header && resultCode !== "" && resultCode !== "00" && resultCode !== "0") {
    return { status: "unavailable", reason: reasonFromPortalCode(resultCode) };
  }
  if (!body) return { status: "unavailable", reason: "upstream_error" };

  let items = extractItems(body);
  // 요청한 물건번호와 같은 건만 쓴다 (거르기가 안 된 응답이 와도 다른 물건을 보여 주지 않도록)
  if (caseNo) items = items.filter((it) => text(it.cltrMngNo) === caseNo.trim());
  if (items.length === 0) return { status: "not_found" };

  const first = pickItem(items);
  const status = text(first.pbctStatNm);
  const bidDate = status === "낙찰" ? toYmd(first.cltrOpbdDt) : null;
  // 낙찰금액(scfbAmt)과 감정가 대비 낙찰가율(apslPrcCtrsScfbPrcRto)은 "낙찰"인 건에서만 쓴다
  const winningBid = status === "낙찰" ? (won(first.scfbAmt) ?? undefined) : undefined;
  const ratioNum = Number(first.apslPrcCtrsScfbPrcRto);
  const winningRatio =
    winningBid && Number.isFinite(ratioNum) && ratioNum > 0 ? `${ratioNum}%` : undefined;

  const rows: [string, string | null][] = [
    ["물건명", text(first.onbidCltrNm)],
    ["재산·처분", [text(first.prptDivNm), text(first.dspsMthodNm)].filter(Boolean).join(" · ") || null],
    ["용도", [text(first.cltrUsgMclsCtgrNm), text(first.cltrUsgSclsCtgrNm)].filter(Boolean).join(" · ") || null],
    ["감정가", won(first.apslEvlAmt)],
    ["개찰일시", toYmdHm(first.cltrOpbdDt)],
    ["입찰 결과", status ? `${status}${text(first.pbctNsq) ? ` (${Number(first.pbctNsq)}회차)` : ""}` : null],
    ["낙찰가액", winningBid ?? null],
    ["감정가 대비", winningRatio ?? null],
  ];
  const info = rows.flatMap(([label, value]) => (value ? [{ label, value }] : []));
  const appraisal = won(first.apslEvlAmt) ?? undefined;
  return {
    status: "found",
    bidDate,
    ...(appraisal ? { appraisal } : {}),
    ...(winningBid ? { winningBid } : {}),
    ...(winningRatio ? { winningRatio } : {}),
    info,
  };
}

// 같은 물건번호를 반복 조회해도 온비드 호출 한도를 쓰지 않도록, 결과를 잠시 재사용한다.
// 조회 불가(오류) 결과는 재사용하지 않는다. 서버 한 개 안에서만 유지되므로 완전한 호출 제한은 아니다.
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map<string, { at: number; result: OnbidLookupResult }>();

/** 물건번호(= 온비드 물건관리번호)로 온비드 공개 정보를 조회한다. 읽기 전용(GET) */
export async function lookupOnbid(caseNo: string): Promise<OnbidLookupResult> {
  // 시험용 가상 물건번호는 실제 온비드를 부르지 않고 가상 결과를 돌려준다 (lib/onbidMock.ts)
  const sample = findOnbidSample(caseNo);
  if (sample) return sample;
  const hit = cache.get(caseNo);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;
  const result = await fetchOnbid(caseNo);
  if (result.status !== "unavailable") {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(caseNo, { at: Date.now(), result });
  }
  return result;
}

/** "YYYY-MM-DD" → "YYYYMMDD" */
function compact(ymd: string): string {
  return ymd.replaceAll("-", "");
}

async function fetchOnbid(caseNo: string): Promise<OnbidLookupResult> {
  const key = process.env.ONBID_SERVICE_KEY;
  if (!key || key.trim() === "") return { status: "unavailable", reason: "no_key" };

  // 개찰일 종료일은 오늘까지만 가능하다. 최근 3년 안에 개찰된 입찰 결과에서 찾는다.
  const today = todayInSeoul();
  const monthDay = today.slice(5) === "02-29" ? "-02-28" : today.slice(4); // 윤년 2월 29일은 28일로
  const start = `${Number(today.slice(0, 4)) - LOOKBACK_YEARS}${monthDay}`;

  const params = new URLSearchParams({
    serviceKey: key.trim().replace(/^﻿/, ""),
    pageNo: "1",
    numOfRows: "20",
    resultType: "json",
    cltrTypeCd: CLTR_TYPE_CD,
    prptDivCd: PRPT_DIV_CD,
    opbdDtStart: compact(start),
    opbdDtEnd: compact(today),
    cltrMngNo: caseNo,
  });

  try {
    const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await response.text();
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      // JSON이 아니면(예: XML 오류) 인증키 오류 문구가 들어 있는지만 본다
      if (/SERVICE_KEY|등록되지 않은/.test(body)) {
        return { status: "unavailable", reason: "key_rejected" };
      }
      return { status: "unavailable", reason: "upstream_error" };
    }
    return parseOnbidResponse(json, caseNo);
  } catch (error) {
    // 오류 내용에 주소(인증키 포함)가 섞일 수 있어 자세한 내용은 남기지 않는다
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return { status: "unavailable", reason: "timeout" };
    }
    return { status: "unavailable", reason: "upstream_error" };
  }
}
