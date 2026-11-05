import type { Metadata } from "next";
import Image from "next/image";
import AccountBar from "@/components/AccountBar";
import "./globals.css";

export const metadata: Metadata = {
  // 내부용이므로 검색 엔진에 나타나지 않게 한다
  robots: { index: false, follow: false },
  title: "공매 매각결정 체크리스트",
  description:
    "압류재산 공매의 매각결정 단계 확인 사항과 매각결정기일을 한눈에 관리하는 내부용 체크리스트",
};

// Design Ref: §3.3, §7.1 — 공통 화면 틀: 제목 + 역할 전환 버튼 + 샘플 데이터 안내 띠 + 본문
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="app-header border-b border-line bg-card/80 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <h1 className="flex items-center gap-3 text-lg font-semibold tracking-tight">
              {/* 회사 로고. 어두운 화면에서도 남색 글자가 보이도록 흰 바탕을 깔았다 */}
              <Image
                src="/logo.png"
                alt="한국자산관리공사 로고"
                width={56}
                height={36}
                priority
                className="h-9 w-auto rounded-md bg-white px-1.5 py-0.5 shadow-sm"
              />
              공매 매각결정 체크리스트
            </h1>
            <AccountBar />
          </div>
          <p
            role="note"
            className="bg-notice-bg px-4 py-2 text-center text-sm text-notice-fg"
          >
            ※ 샘플 데이터 전용입니다. 실제 업무 정보를 입력하지 마세요.
          </p>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
