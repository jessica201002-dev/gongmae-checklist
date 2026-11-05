// Design Ref: §6, §9 — 로그인 상태(세션). 서버가 서명한 쿠키로 기억한다.
// 쿠키에는 아이디·역할·구분값과 만료 시각만 들어 있고, 서버만 아는 비밀키(SESSION_SECRET)로 서명해 위조를 막는다.
// 쿠키는 JavaScript에서 읽을 수 없고(HttpOnly), 다른 사이트에서 보내는 쓰기 요청에는 붙지 않는다(SameSite).
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isRole, type Role } from "./role";

export const SESSION_COOKIE = "gongmae_session";
/** 로그인 유지 시간: 8시간 */
export const SESSION_MAX_AGE_SEC = 8 * 60 * 60;

/** 로그인한 사용자. 담당자는 ownerCode(보는 물건의 담당자 구분값)가 있다 */
export interface SessionUser {
  loginId: string;
  role: Role;
  ownerCode: string | null;
}

interface Payload extends SessionUser {
  exp: number; // 만료 시각(초)
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  // 값은 출력하지 않고 없다는 사실만 알린다
  if (!value || value.length < 32) {
    throw new Error(".env의 SESSION_SECRET이 없거나 너무 짧습니다(32자 이상).");
  }
  return value;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

/** 로그인 성공 시 쿠키에 넣을 값을 만든다 */
export function createSessionToken(user: SessionUser, nowSec = Math.floor(Date.now() / 1000)): string {
  const payload: Payload = { ...user, exp: nowSec + SESSION_MAX_AGE_SEC };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** 쿠키 값이 서명이 맞고 만료되지 않았으면 사용자를, 아니면 null을 돌려준다 */
export function verifySessionToken(
  token: string,
  nowSec = Math.floor(Date.now() / 1000),
): SessionUser | null {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;
    if (typeof p.exp !== "number" || p.exp < nowSec) return null;
    if (typeof p.loginId !== "string" || !isRole(p.role)) return null;
    if (p.ownerCode !== null && typeof p.ownerCode !== "string") return null;
    return { loginId: p.loginId, role: p.role, ownerCode: p.ownerCode };
  } catch {
    return null;
  }
}

/** 요청의 쿠키에서 로그인한 사용자를 읽는다. 로그인하지 않았으면 null */
export function readSession(request: Request): SessionUser | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === SESSION_COOKIE) {
      return verifySessionToken(part.slice(index + 1).trim());
    }
  }
  return null;
}

function cookieAttributes(maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

/** 로그인 쿠키를 심는 Set-Cookie 값 */
export function sessionCookieHeader(user: SessionUser): string {
  return `${SESSION_COOKIE}=${createSessionToken(user)}; ${cookieAttributes(SESSION_MAX_AGE_SEC)}`;
}

/** 로그인 쿠키를 지우는 Set-Cookie 값 */
export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; ${cookieAttributes(0)}`;
}
