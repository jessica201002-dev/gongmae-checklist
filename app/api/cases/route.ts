// Design Ref: §6 — GET /api/cases (목록), POST /api/cases (물건 등록). 로그인이 필요하다.
import type { NextRequest } from "next/server";
import {
  authenticate,
  badBody,
  fail,
  ok,
  readJsonObject,
  toErrorResponse,
} from "@/lib/api";
import { buildCaseView } from "@/lib/caseView";
import { todayInSeoul } from "@/lib/deadline";
import { createCase, listCases } from "@/lib/db/cases";
import { validateCaseNo } from "@/lib/validation";

/**
 * 물건 목록 (등록 순). 담당자는 자기 구분값의 물건만, 팀장·부점장은 전체를 본다.
 * 팀장·부점장은 ?owner=구분값 으로 걸러 볼 수 있다.
 */
export async function GET(request: NextRequest) {
  const auth = authenticate(request);
  if (auth.response) return auth.response;
  try {
    const { session } = auth;
    const owner =
      session.role === "staff"
        ? (session.ownerCode ?? undefined)
        : request.nextUrl.searchParams.get("owner")?.trim() || undefined;
    // 담당자 계정에 구분값이 없으면 아무것도 보이지 않게 한다(전체가 보이면 안 된다)
    if (session.role === "staff" && !owner) return ok([]);
    const today = todayInSeoul();
    const cases = await listCases(owner);
    return ok(cases.map((item) => buildCaseView(item.record, item.checks, today)));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** 물건 등록 (담당자만). 본문: { caseNo } — 담당자 구분값은 로그인한 계정의 값으로 자동 정해진다 */
export async function POST(request: NextRequest) {
  const auth = authenticate(request, { staffOnly: true });
  if (auth.response) return auth.response;
  try {
    const ownerCode = auth.session.ownerCode;
    if (!ownerCode) {
      return fail("VALIDATION_ERROR", "계정에 담당자 구분값이 없어 등록할 수 없습니다.", 400);
    }
    const body = await readJsonObject(request);
    if (!body) return badBody();

    const caseNo = validateCaseNo(body.caseNo);
    if (!caseNo.ok) return fail("VALIDATION_ERROR", caseNo.message, 400);

    const created = await createCase(caseNo.value, ownerCode);
    return ok(buildCaseView(created.record, created.checks, todayInSeoul()), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
