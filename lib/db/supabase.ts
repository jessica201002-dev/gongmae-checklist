// Design Ref: §3.3, §9 — Supabase 연결. 서버 코드에서만 쓴다.
// 접속 주소와 서버용 키는 .env에서만 읽고, NEXT_PUBLIC_ 접두사는 쓰지 않는다.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** 서버용 키로 연결한 Supabase 클라이언트 (한 번 만들어 재사용) */
export function getSupabase(): SupabaseClient {
  // 배포 환경에 값을 넣을 때 맨 앞에 보이지 않는 글자(BOM, U+FEFF)나 공백·줄바꿈이 따라 들어갈 수 있다.
  // 그 글자가 있으면 접속 요청이 실패하므로 값을 쓰기 전에 걷어 낸다. (값은 출력하지 않는다)
  const clean = (v: string | undefined) => v?.replace(/^﻿/, "").trim();
  const url = clean(process.env.SUPABASE_URL);
  const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceKey) {
    // 값은 절대 출력하지 않고, 없다는 사실만 알린다
    throw new Error(
      ".env에 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.",
    );
  }
  client ??= createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
