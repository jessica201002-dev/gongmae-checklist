// Design Ref: §6 — GET /api/cases (목록), POST /api/cases (물건 등록)
import type { NextRequest } from "next/server";
import {
  badBody,
  fail,
  ok,
  readJsonObject,
  requireStaff,
  toErrorResponse,
} from "@/lib/api";
import { buildCaseView } from "@/lib/caseView";
import { todayInSeoul } from "@/lib/deadline";
import { createCase, listCases } from "@/lib/db/cases";
import { validateCaseNo, validateOwnerCode } from "@/lib/validation";

/** 물건 목록 (등록 순). ?owner=구분값 으로 걸러 볼 수 있다. 모든 역할이 볼 수 있다 */
export async function GET(request: NextRequest) {
  try {
    const owner = request.nextUrl.searchParams.get("owner")?.trim() || undefined;
    const today = todayInSeoul();
    const cases = await listCases(owner);
    return ok(cases.map((item) => buildCaseView(item.record, item.checks, today)));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** 물건 등록 (담당자만). 본문: { caseNo, ownerCode } */
export async function POST(request: NextRequest) {
  const forbidden = requireStaff(request);
  if (forbidden) return forbidden;
  try {
    const body = await readJsonObject(request);
    if (!body) return badBody();

    const caseNo = validateCaseNo(body.caseNo);
    if (!caseNo.ok) return fail("VALIDATION_ERROR", caseNo.message, 400);
    const ownerCode = validateOwnerCode(body.ownerCode);
    if (!ownerCode.ok) return fail("VALIDATION_ERROR", ownerCode.message, 400);

    const created = await createCase(caseNo.value, ownerCode.value);
    return ok(buildCaseView(created.record, created.checks, todayInSeoul()), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
