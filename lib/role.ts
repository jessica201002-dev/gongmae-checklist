// Design Ref: §3.3, §7.3 — 역할 값과 기억 방식. 로그인 없이 화면에서 역할을 고른다.
// 고른 역할은 새로고침해도 유지되고(브라우저 localStorage), 처음 접속하면 "담당자"로 시작한다.
// ※ 역할 선택은 실제 접근 통제가 아니다. (PRD 7번: 샘플 데이터만 사용)
// ※ useRole은 클라이언트 컴포넌트에서만 쓴다.
import { useSyncExternalStore } from "react";

/** 역할 3가지. canEdit이 true인 역할만 입력·체크·삭제를 할 수 있다 */
export const ROLES = [
  {
    key: "staff",
    label: "담당자",
    canEdit: true,
    description: "물건을 등록하고 체크리스트를 체크할 수 있습니다.",
  },
  {
    key: "manager",
    label: "팀장",
    canEdit: false,
    description: "담당자가 체크한 내용을 열람만 할 수 있습니다.",
  },
  {
    key: "director",
    label: "부점장",
    canEdit: false,
    description: "체크리스트를 바탕으로 업무를 검토하며, 열람만 할 수 있습니다.",
  },
] as const;

export type Role = (typeof ROLES)[number]["key"];

/** 처음 접속했을 때의 역할 */
export const DEFAULT_ROLE: Role = "staff";

/** 브라우저에 역할을 기억해 두는 이름 */
export const ROLE_STORAGE_KEY = "gongmae-checklist-role";

export function isRole(value: unknown): value is Role {
  return ROLES.some((role) => role.key === value);
}

export function getRoleInfo(role: Role) {
  return ROLES.find((item) => item.key === role) ?? ROLES[0];
}

// Plan SC: FR-07 — 완료 체크는 담당자만 할 수 있고, 팀장·부점장은 열람만 한다.
/** 입력·체크·삭제를 할 수 있는 역할인지 */
export function canEdit(role: Role): boolean {
  return getRoleInfo(role).canEdit;
}

// ----- 브라우저에 기억하기 -----
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
