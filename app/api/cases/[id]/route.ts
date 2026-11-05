// Design Ref: §6 — GET /api/cases/:id (상세), PATCH (낙찰일·등기번호 저장), DELETE (물건 삭제). 로그인이 필요하다.
// 담당자는 자기 구분값의 물건만 다룰 수 있다(다른 구분값의 물건은 "없는 물건"으로 응답한다).
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
import { deleteCase, getCase, updateCase } from "@/lib/db/cases";
import {
  isUuid,
  validateBidDate,
  validateDeliveryRegNo,
} from "@/lib/validation";

/** 물건 상세 + 체크 6개. 담당자는 자기 물건만, 팀장·부점장은 모두 볼 수 있다 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/cases/[id]">,
) {
  const auth = authenticate(request);
  if (auth.response) return auth.response;
  try {
    const { id } = await ctx.params;
    if (!isUuid(id)) return notFound();
    const found = await getCase(id);
    if (!found || !canAccessCase(auth.session, found.record.ownerCode)) return notFound();
    return ok(buildCaseView(found.record, found.checks, todayInSeoul()));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** 낙찰일(bidDate)·등기번호(deliveryRegNo) 저장 (담당자만). 값을 null로 보내면 지운다 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/cases/[id]">,
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

    const patch: { bidDate?: string | null; deliveryRegNo?: string | null } = {};
    if ("bidDate" in body) {
      const bidDate = validateBidDate(body.bidDate);
      if (!bidDate.ok) return fail("VALIDATION_ERROR", bidDate.message, 400);
      patch.bidDate = bidDate.value;
    }
    if ("deliveryRegNo" in body) {
      const regNo = validateDeliveryRegNo(body.deliveryRegNo);
      if (!regNo.ok) return fail("VALIDATION_ERROR", regNo.message, 400);
      patch.deliveryRegNo = regNo.value;
    }
    if (Object.keys(patch).length === 0) {
      return fail(
        "VALIDATION_ERROR",
        "저장할 항목(bidDate, deliveryRegNo)이 없습니다.",
        400,
      );
    }

    const updated = await updateCase(id, patch);
    return ok(buildCaseView(updated.record, updated.checks, todayInSeoul()));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** 물건 삭제 (담당자만). 항목 체크도 함께 삭제된다 */
export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/cases/[id]">,
) {
  const auth = authenticate(request, { staffOnly: true });
  if (auth.response) return auth.response;
  try {
    const { id } = await ctx.params;
    if (!isUuid(id)) return notFound();
    const found = await getCase(id);
    if (!found || !canAccessCase(auth.session, found.record.ownerCode)) return notFound();
    const deleted = await deleteCase(id);
    if (!deleted) return notFound();
    return ok({ id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
