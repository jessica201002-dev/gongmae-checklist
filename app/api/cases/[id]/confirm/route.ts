// Design Ref: §6 — PUT /api/cases/:id/confirm : 결재선 확인 표시를 남기거나 취소한다. 로그인이 필요하다.
//  - 담당자: 자기 구분값의 물건에 "담당자 확인"만 남길 수 있다.
//  - 팀장: 어느 물건이든 "팀장 확인"만 남길 수 있고, 담당자 확인이 있어야 한다(없으면 409).
//  - 부점장: 열람만 한다(403). 부점장의 결재는 앱 밖에서 진행한다.
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
import { confirmLevelOfRole, isConfirmLevel } from "@/lib/confirmation";
import { todayInSeoul } from "@/lib/deadline";
import { getCase, setConfirmation } from "@/lib/db/cases";
import { isUuid } from "@/lib/validation";

/** 본문: { level: "staff" | "manager", confirmed: true | false } */
export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/cases/[id]/confirm">,
) {
  const auth = authenticate(request);
  if (auth.response) return auth.response;
  const { session } = auth;
  try {
    const { id } = await ctx.params;
    if (!isUuid(id)) return notFound();
    const found = await getCase(id);
    if (!found || !canAccessCase(session, found.record.ownerCode)) return notFound();

    const body = await readJsonObject(request);
    if (!body) return badBody();
    if (!isConfirmLevel(body.level) || typeof body.confirmed !== "boolean") {
      return fail(
        "VALIDATION_ERROR",
        'level("staff" 또는 "manager")과 confirmed(true 또는 false)를 보내 주세요.',
        400,
      );
    }
    // 자기 역할의 단계만 남기거나 취소할 수 있다
    if (confirmLevelOfRole(session.role) !== body.level) {
      return fail("ROLE_FORBIDDEN", "내 역할로는 할 수 없는 확인입니다.", 403);
    }

    const updated = await setConfirmation(id, body.level, body.confirmed, session.loginId);
    return ok(buildCaseView(updated.record, updated.checks, todayInSeoul()));
  } catch (error) {
    return toErrorResponse(error);
  }
}
