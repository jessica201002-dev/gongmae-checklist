// Design Ref: §3.3, §6, §7.3 — 역할 값과 권한 규칙. 로그인 없이 화면에서 역할을 고른다.
// ※ 역할 선택은 실제 접근 통제가 아니다. (PRD 7번: 샘플 데이터만 사용)
// ※ 이 파일은 서버 코드와 브라우저 코드 모두에서 쓴다. 브라우저에 기억하는 부분은 useRole.ts에 있다.

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

/** 서버 API에 현재 역할을 알리는 요청 머리글 이름 (DESIGN §6) */
export const ROLE_HEADER = "x-role";

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
