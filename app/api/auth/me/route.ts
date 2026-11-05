// Design Ref: §6 — GET /api/auth/me : 지금 로그인한 사용자를 알려 준다. 로그인하지 않았으면 401.
import type { NextRequest } from "next/server";
import { authenticate, ok } from "@/lib/api";

export async function GET(request: NextRequest) {
  const auth = authenticate(request);
  if (auth.response) return auth.response;
  return ok(auth.session);
}
