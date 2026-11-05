// Design Ref: §5.5 — accounts 표 읽기. 서버 코드에서만 쓴다.
import "server-only";
import { isRole, type Role } from "../role";
import { getSupabase } from "./supabase";

export interface AccountRow {
  loginId: string;
  passwordHash: string;
  role: Role;
  ownerCode: string | null;
}

/** 로그인 아이디로 계정을 찾는다. 없으면 null */
export async function findAccount(loginId: string): Promise<AccountRow | null> {
  const { data, error } = await getSupabase()
    .from("accounts")
    .select("login_id, password_hash, role, owner_code")
    .eq("login_id", loginId)
    .maybeSingle();
  if (error) throw new Error(`저장소 오류(${error.code ?? "?"}): ${error.message}`);
  if (!data || !isRole(data.role)) return null;
  return {
    loginId: data.login_id as string,
    passwordHash: data.password_hash as string,
    role: data.role,
    ownerCode: (data.owner_code as string | null) ?? null,
  };
}
