// Design Ref: §6 — 서버 API 공통 도우미: 응답 형식, 역할 확인, 요청 읽기, 오류 응답
// 성공: { "data": ... }  /  오류: { "error": { "code": "...", "message": "...", "details": {} } }
import { CaseNotFoundError, DuplicateCaseError } from "./db/cases";
import { ROLE_HEADER, canEdit, isRole } from "./role";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "ROLE_FORBIDDEN"
  | "CASE_NOT_FOUND"
  | "CASE_DUPLICATE"
  | "SERVER_ERROR";

/** 성공 응답 */
export function ok<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

/** 오류 응답 */
export function fail(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): Response {
  return Response.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

// Plan SC: FR-07 — 완료 체크·등록·수정·삭제는 담당자만 할 수 있다.
// ※ 역할은 화면에서 고른 값을 머리글로 받을 뿐이라 진짜 보안은 아니다. (PRD 7번)
/** 담당자가 아니면 403 응답을, 담당자면 null을 돌려준다 */
export function requireStaff(request: Request): Response | null {
  const role = request.headers.get(ROLE_HEADER);
  if (isRole(role) && canEdit(role)) return null;
  return fail("ROLE_FORBIDDEN", "담당자만 할 수 있는 작업입니다.", 403);
}

/** 요청 본문(JSON 객체)을 읽는다. 읽을 수 없거나 객체가 아니면 null */
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // JSON이 아니면 아래에서 null을 돌려준다
  }
  return null;
}

export function badBody(): Response {
  return fail(
    "VALIDATION_ERROR",
    "요청 내용을 읽을 수 없습니다. JSON 형식인지 확인해 주세요.",
    400,
  );
}

export function notFound(): Response {
  return fail("CASE_NOT_FOUND", "없는 물건입니다.", 404);
}

/** 던져진 오류를 알맞은 응답으로 바꾼다. 알 수 없는 오류는 서버 기록에만 자세히 남긴다 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof DuplicateCaseError) {
    return fail("CASE_DUPLICATE", "이미 등록된 물건번호입니다.", 409);
  }
  if (error instanceof CaseNotFoundError) return notFound();
  console.error(
    "[api] 처리 중 오류:",
    error instanceof Error ? error.message : "알 수 없는 오류",
  );
  return fail("SERVER_ERROR", "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
}
