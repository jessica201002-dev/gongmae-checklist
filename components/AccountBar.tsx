"use client";

// Design Ref: §7.1, §7.3 — 화면 위쪽의 계정 표시와 로그아웃 버튼. (이전의 역할 전환 버튼을 대신한다)
// 역할은 로그인한 계정에 정해져 있어 화면에서 바꿀 수 없다.
import { getRoleInfo } from "@/lib/role";
import { logout, useSession } from "@/lib/useSession";

export default function AccountBar() {
  const session = useSession();
  if (session.status !== "authed") return null;
  const { user } = session;
  const info = getRoleInfo(user.role);

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-surface px-3 py-1 font-semibold">{info.label}</span>
        <span>
          <span className="sr-only">로그인 계정: </span>
          <strong>{user.loginId}</strong>
          {user.ownerCode && <span className="text-muted"> · 구분값 {user.ownerCode}</span>}
        </span>
        <button
          type="button"
          onClick={() => void logout()}
          className="min-h-11 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          로그아웃
        </button>
      </div>
      <p className="text-sm text-muted">{info.description}</p>
    </div>
  );
}
