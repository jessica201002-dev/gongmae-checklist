"use client";

// Design Ref: §7.1, §7.3 — 화면 위쪽의 역할 전환 버튼 (담당자 / 팀장 / 부점장)
import { ROLES, getRoleInfo, setRole, useRole } from "@/lib/role";

export default function RoleSwitcher() {
  const role = useRole();
  const info = getRoleInfo(role);

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div role="group" aria-label="역할 전환" className="flex gap-2">
        {ROLES.map((item) => {
          const selected = item.key === role;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setRole(item.key)}
              className={
                "min-h-11 min-w-20 rounded-md border px-4 text-sm font-medium transition-colors " +
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground " +
                (selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-surface")
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="text-sm text-muted">
        현재 역할: <strong className="text-foreground">{info.label}</strong> —{" "}
        {info.description}
      </p>
    </div>
  );
}
