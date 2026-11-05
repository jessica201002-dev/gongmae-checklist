// Design Ref: §6 — POST /api/auth/logout : 로그인 쿠키를 지운다.
import type { NextRequest } from "next/server";
import { checkOrigin, ok } from "@/lib/api";
import { clearSessionCookieHeader } from "@/lib/session";

export async function POST(request: NextRequest) {
  const originError = checkOrigin(request);
  if (originError) return originError;
  const response = ok({ loggedOut: true });
  response.headers.append("Set-Cookie", clearSessionCookieHeader());
  return response;
}
