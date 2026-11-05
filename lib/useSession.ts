// Design Ref: §6, §7.3 — 브라우저에서 "지금 누가 로그인했는지"를 알고 로그인·로그아웃을 하는 도우미.
// 로그인 상태 자체는 서버가 준 보안 쿠키에 있고(JavaScript로는 읽을 수 없다), 여기서는 /api/auth/me로 물어본 결과만 들고 있다.
// ※ 브라우저(클라이언트 컴포넌트)에서만 쓴다.
import { useSyncExternalStore } from "react";
import type { Role } from "./role";

/** 화면에서 쓰는 로그인 사용자 정보 */
export interface ClientUser {
  loginId: string;
  role: Role;
  /** 담당자 계정이 보는 물건의 담당자 구분값 (팀장·부점장은 null) */
  ownerCode: string | null;
}

export type SessionState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "authed"; user: ClientUser };

// 서버에서 그릴 때 쓰는 값. 매번 새 객체를 만들면 React가 무한 반복으로 보고 경고하므로 하나를 재사용한다
const SERVER_STATE: SessionState = { status: "loading" };

let state: SessionState = { status: "loading" };
let started = false;
const listeners = new Set<() => void>();

function set(next: SessionState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

async function loadSession(): Promise<void> {
  try {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    if (response.ok) {
      const json = (await response.json()) as { data: ClientUser };
      set({ status: "authed", user: json.data });
      return;
    }
  } catch {
    // 서버에 연결하지 못하면 로그인하지 않은 것으로 보고 로그인 화면을 보여 준다
  }
  set({ status: "anon" });
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!started) {
    started = true;
    void loadSession();
  }
  return () => {
    listeners.delete(onChange);
  };
}

/** 지금 로그인 상태. 서버에서 그릴 때는 항상 "확인 중"이다 */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

/** 서버가 "로그인이 필요합니다"(401)라고 했을 때 화면의 로그인 상태를 지운다 */
export function markAnonymous(): void {
  set({ status: "anon" });
}

/** 로그인. 성공하면 null, 실패하면 화면에 보여 줄 문구를 돌려준다 */
export async function login(loginId: string, password: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
      cache: "no-store",
    });
  } catch {
    return "서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.";
  }
  let json: { data?: ClientUser; error?: { message?: string } } | null = null;
  try {
    json = await response.json();
  } catch {
    // 본문을 읽지 못하면 아래 일반 문구를 쓴다
  }
  if (response.ok && json?.data) {
    set({ status: "authed", user: json.data });
    return null;
  }
  return json?.error?.message ?? "로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

/** 로그아웃: 서버가 쿠키를 지우고, 화면은 로그인하지 않은 상태가 된다 */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
  } catch {
    // 연결하지 못해도 화면에서는 로그아웃한 상태로 만든다(쿠키는 8시간 뒤 만료된다)
  }
  set({ status: "anon" });
}
