// Design Ref: §6 — 서버 API 공통 도우미: 응답 형식, 역할 확인, 요청 읽기, 오류 응답
// 성공: { "data": ... }  /  오류: { "error": { "code": "...", "message": "...", "details": {} } }
import { CaseNotFoundError, ConfirmOrderError, DuplicateCaseError } from "./db/cases";
import { canEdit } from "./role";
import { readSession, type SessionUser } from "./session";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "ROLE_FORBIDDEN"
  | "ORIGIN_FORBIDDEN"
  | "CONFIRM_ORDER"
  | "RATE_LIMITED"
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

// Plan SC: FR-07 — 완료 체크·등록·수정·삭제는 담당자만 할 수 있다. 로그인한 계정의 역할을 서버가 직접 확인한다.
/** 쓰기 요청(GET·HEAD 외)이 다른 사이트에서 온 것이면 403 응답을, 아니면 null을 돌려준다 */
export function checkOrigin(request: Request): Response | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD") return null;
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    // 형식이 이상하면 아래에서 거절한다
  }
  return originHost === host
    ? null
    : fail("ORIGIN_FORBIDDEN", "허용되지 않은 요청입니다.", 403);
}

/** 로그인 확인 결과: 사용자 정보 또는 그대로 돌려줄 오류 응답 */
export type Auth =
  | { session: SessionUser; response?: undefined }
  | { session?: undefined; response: Response };

/**
 * 모든 API의 입구에서 부른다. 로그인하지 않았으면 401, staffOnly인데 담당자가 아니면 403.
 * 쓰기 요청(GET·HEAD 외)은 다른 사이트에서 온 요청인지도 확인한다.
 */
export function authenticate(request: Request, options: { staffOnly?: boolean } = {}): Auth {
  const originError = checkOrigin(request);
  if (originError) return { response: originError };
  const session = readSession(request);
  if (!session) {
    return { response: fail("UNAUTHORIZED", "로그인이 필요합니다.", 401) };
  }
  if (options.staffOnly && !canEdit(session.role)) {
    return { response: fail("ROLE_FORBIDDEN", "담당자만 할 수 있는 작업입니다.", 403) };
  }
  return { session };
}

/** 이 사용자가 그 물건을 볼 수 있는지: 담당자는 자기 구분값의 물건만, 팀장·부점장은 모두 */
export function canAccessCase(session: SessionUser, ownerCode: string): boolean {
  return session.role !== "staff" || session.ownerCode === ownerCode;
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
  if (error instanceof ConfirmOrderError) {
    return fail("CONFIRM_ORDER", "담당자 확인이 먼저 필요합니다.", 409);
  }
  console.error(
    "[api] 처리 중 오류:",
    error instanceof Error ? error.message : "알 수 없는 오류",
  );
  return fail("SERVER_ERROR", "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
}
