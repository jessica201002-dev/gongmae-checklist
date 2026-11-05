"use client";

// 로그인 화면의 입력 폼. 아이디·비밀번호를 서버로 보내 확인하고, 성공하면 첫 화면으로 이동한다.
// 실패 문구는 아이디가 틀렸는지 비밀번호가 틀렸는지 알려 주지 않는다.
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { login, useSession } from "@/lib/useSession";


export default function LoginForm() {
  const router = useRouter();
  const session = useSession();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idInputId = useId();
  const pwInputId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);

  // 이미 로그인한 상태로 이 화면에 오면 첫 화면으로 보낸다
  useEffect(() => {
    if (session.status === "authed") router.replace("/");
  }, [session.status, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (loginId.trim() === "" || password === "") {
      setError("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const message = await login(loginId.trim(), password);
    setSubmitting(false);
    if (message) {
      setError(message);
      // 비밀번호를 다시 입력할 수 있게 비우고 초점을 옮긴다
      setPassword("");
      passwordRef.current?.focus();
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-6 sm:py-12">
      <div className="reveal flex flex-col gap-2">
        {/* 회사 로고 (어두운 화면에서도 보이도록 흰 바탕) */}
        <Image
          src="/logo.png"
          alt="한국자산관리공사 로고"
          width={112}
          height={72}
          priority
          className="mb-2 h-[72px] w-auto self-start rounded-lg bg-white px-3 py-1.5 shadow-sm"
        />
        <p className="text-xs font-semibold tracking-[0.18em] text-muted">
          압류재산 공매업무 · 매각결정 단계
        </p>
        <h2 className="text-3xl font-semibold leading-tight tracking-tight">
          로그인
        </h2>
        <p className="text-sm text-muted">
          계정으로 로그인하면 담당자는 내 물건을, 팀장·부점장은 전체 물건을 볼 수 있습니다.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="로그인"
        className="surface-card accent-top reveal flex flex-col gap-4 p-6 pt-7"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor={idInputId} className="field-label">
            아이디
          </label>
          <input
            id={idInputId}
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            maxLength={30}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className="field"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={pwInputId} className="field-label">
            비밀번호
          </label>
          <input
            id={pwInputId}
            ref={passwordRef}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            maxLength={200}
            autoComplete="current-password"
            className="field"
          />
        </div>
        {error && (
          <p role="alert" className="text-[13px] font-semibold text-danger-fg">
            {error}
          </p>
        )}
        <button
          type="submit"
          aria-disabled={submitting}
          className="btn btn-primary w-full"
        >
          {submitting ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <p className="text-xs text-muted">
        이 앱은 내부용이며 샘플(가짜) 데이터만 사용합니다. 계정은 관리자가 만들어 드립니다.
      </p>
    </div>
  );
}
