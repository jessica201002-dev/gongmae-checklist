// Design Ref: §6 — PUT /api/cases/:id/checks (항목 하나 저장). 로그인한 담당자가 자기 물건에만 할 수 있다.
import type { NextRequest } from "next/server";
import {
  authenticate,
  badBody,
  canAccessCase,
  fail,
  notFound,
  ok,
  readJsonObject,
  toErrorResponse,
} from "@/lib/api";
import { buildCaseView } from "@/lib/caseView";
import { todayInSeoul } from "@/lib/deadline";
import { getCase, setCheck } from "@/lib/db/cases";
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
  const auth = authenticate(request, { staffOnly: true });
  if (auth.response) return auth.response;
  try {
    const { id } = await ctx.params;
    if (!isUuid(id)) return notFound();
    const found = await getCase(id);
    if (!found || !canAccessCase(auth.session, found.record.ownerCode)) return notFound();
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
