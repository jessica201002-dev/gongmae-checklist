// Design Ref: §3.3, §7.3 — 역할을 브라우저에 기억하는 방식.
// 고른 역할은 새로고침해도 유지되고(브라우저 localStorage), 처음 접속하면 "담당자"로 시작한다.
// ※ 브라우저(클라이언트 컴포넌트)에서만 쓴다. 서버 코드는 role.ts를 쓴다.
import { useSyncExternalStore } from "react";
import { DEFAULT_ROLE, isRole, type Role } from "./role";

/** 브라우저에 역할을 기억해 두는 이름 */
export const ROLE_STORAGE_KEY = "gongmae-checklist-role";

// 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서도 역할 전환은 동작하도록 메모리에도 둔다.
let memoryRole: Role | null = null;
const listeners = new Set<() => void>();

function readRole(): Role {
  try {
    const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (isRole(stored)) return stored;
  } catch {
    // 저장소를 읽을 수 없으면 메모리 값을 쓴다
  }
  return memoryRole ?? DEFAULT_ROLE;
}

/** 역할을 바꾸고 기억해 둔다. 화면의 모든 useRole 사용처가 함께 바뀐다 */
export function setRole(role: Role): void {
  memoryRole = role;
  try {
    window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  } catch {
    // 저장하지 못해도 이번 접속 동안은 메모리 값으로 동작한다
  }
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // 다른 탭에서 역할을 바꿨을 때도 따라가도록 한다
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** 현재 역할. 서버에서 그릴 때는 항상 기본 역할이고, 브라우저에서 저장된 값으로 바뀐다 */
export function useRole(): Role {
  return useSyncExternalStore(subscribe, readRole, () => DEFAULT_ROLE);
}
