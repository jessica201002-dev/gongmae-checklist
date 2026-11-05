// Design Ref: §6 — POST /api/cases/:id/onbid : 그 물건의 물건번호로 온비드 공개 정보를 조회한다 (담당자만, 조회만 함).
// 단방향: 온비드로는 물건번호만 쓰고, 결과를 저장하지 않는다(낙찰일은 담당자가 확인한 뒤 저장해야 반영된다).
import type { NextRequest } from "next/server";
import { notFound, ok, requireStaff, toErrorResponse } from "@/lib/api";
import { getCase } from "@/lib/db/cases";
import { lookupOnbid } from "@/lib/onbid";
import { isUuid } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/cases/[id]/onbid">,
) {
  const forbidden = requireStaff(request);
  if (forbidden) return forbidden;
  try {
    const { id } = await ctx.params;
    if (!isUuid(id)) return notFound();
    const found = await getCase(id);
    if (!found) return notFound();
    // 조회 결과(찾음/결과 없음/조회 불가)는 업무상 정상적인 결과이므로 200으로 돌려주고 status로 구분한다
    return ok(await lookupOnbid(found.record.caseNo));
  } catch (error) {
    return toErrorResponse(error);
  }
}
