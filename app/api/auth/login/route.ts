// Design Ref: §6, §9 — POST /api/auth/login : 아이디·비밀번호 확인 후 로그인 쿠키를 심는다.
import type { NextRequest } from "next/server";
import { badBody, checkOrigin, fail, ok, readJsonObject, toErrorResponse } from "@/lib/api";
import { findAccount } from "@/lib/db/accounts";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sessionCookieHeader } from "@/lib/session";

// 비밀번호를 계속 바꿔 가며 맞춰 보는 공격을 늦추기 위해, 같은 (접속 주소, 아이디)의 실패 횟수를 센다.
// 서버 한 개 안에서만 유지되는 간단한 제한이다. (완전한 방어는 아님)
const MAX_FAILURES = 5;
const WINDOW_MS = 10 * 60 * 1000;
const failures = new Map<string, { count: number; first: number }>();

function failureKey(request: NextRequest, loginId: string): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `${ip}|${loginId}`;
}

function isLocked(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(key: string): void {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    if (failures.size > 1000) failures.clear();
    failures.set(key, { count: 1, first: Date.now() });
  } else {
    entry.count += 1;
  }
}

// 없는 아이디일 때도 같은 시간이 걸리도록 쓰는 가짜 해시 (아이디가 있는지 응답 시간으로 알아내지 못하게)
let dummyHash: Promise<string> | null = null;

const BAD_LOGIN = "아이디 또는 비밀번호가 올바르지 않습니다.";

export async function POST(request: NextRequest) {
  const originError = checkOrigin(request);
  if (originError) return originError;
  try {
    const body = await readJsonObject(request);
    if (!body) return badBody();
    const loginId = typeof body.loginId === "string" ? body.loginId.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (loginId === "" || password === "" || loginId.length > 30 || password.length > 200) {
      return fail("VALIDATION_ERROR", "아이디와 비밀번호를 입력해 주세요.", 400);
    }

    const key = failureKey(request, loginId);
    if (isLocked(key)) {
      return fail(
        "RATE_LIMITED",
        "로그인에 여러 번 실패했습니다. 잠시 뒤에 다시 시도해 주세요.",
        429,
      );
    }

    const account = await findAccount(loginId);
    const valid = account
      ? await verifyPassword(password, account.passwordHash)
      : await verifyPassword(password, await (dummyHash ??= hashPassword("dummy-password")));
    if (!account || !valid) {
      recordFailure(key);
      return fail("UNAUTHORIZED", BAD_LOGIN, 401);
    }

    failures.delete(key);
    const user = { loginId: account.loginId, role: account.role, ownerCode: account.ownerCode };
    const response = ok(user);
    response.headers.append("Set-Cookie", sessionCookieHeader(user));
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
