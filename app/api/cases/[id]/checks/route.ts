// Design Ref: §6 — PUT /api/cases/:id/checks (항목 하나 저장)
import type { NextRequest } from "next/server";
import {
  badBody,
  fail,
  notFound,
  ok,
  readJsonObject,
  requireStaff,
  toErrorResponse,
} from "@/lib/api";
import { buildCaseView } from "@/lib/caseView";
import { todayInSeoul } from "@/lib/deadline";
import { setCheck } from "@/lib/db/cases";
import { isUuid, validateCheckInput } from "@/lib/validation";

/**
 * 항목 하나의 상태를 저장한다 (담당자만).
 * 본문: { itemKey, status } — status는 "done"(완료) | "na"(해당 없음) | null(미완료로 되돌리기)
 * 저장 뒤의 물건 정보(완료 수, 기한 상태 포함)를 돌려준다.
 */
export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/cases/[id]/checks">,
) {
  const forbidden = requireStaff(request);
  if (forbidden) return forbidden;
  try {
    const { id } = await ctx.params;
    if (!isUuid(id)) return notFound();
    const body = await readJsonObject(request);
    if (!body) return badBody();

    const input = validateCheckInput(body);
    if (!input.ok) return fail("VALIDATION_ERROR", input.message, 400);

    const updated = await setCheck(id, input.value.itemKey, input.value.status);
    return ok(buildCaseView(updated.record, updated.checks, todayInSeoul()));
  } catch (error) {
    return toErrorResponse(error);
  }
}
