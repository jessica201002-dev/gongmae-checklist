import type { Metadata } from "next";
import RoleSwitcher from "@/components/RoleSwitcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "압류재산 공매업무 체크리스트",
  description:
    "압류재산 공매의 매각결정 단계 확인 사항과 매각결정기일을 한눈에 관리하는 내부용 체크리스트",
};

// Design Ref: §3.3, §7.1 — 공통 화면 틀: 제목 + 역할 전환 버튼 + 샘플 데이터 안내 띠 + 본문
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-lg font-semibold tracking-tight">
              압류재산 공매업무 체크리스트
            </h1>
            <RoleSwitcher />
          </div>
          <p
            role="note"
            className="bg-notice-bg px-4 py-2 text-center text-sm text-notice-fg"
          >
            ※ 샘플 데이터 전용입니다. 실제 업무 정보를 입력하지 마세요.
          </p>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
