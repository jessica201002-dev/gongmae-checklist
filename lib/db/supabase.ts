// Design Ref: §3.3, §9 — Supabase 연결. 서버 코드에서만 쓴다.
// 접속 주소와 서버용 키는 .env에서만 읽고, NEXT_PUBLIC_ 접두사는 쓰지 않는다.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** 서버용 키로 연결한 Supabase 클라이언트 (한 번 만들어 재사용) */
export function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
