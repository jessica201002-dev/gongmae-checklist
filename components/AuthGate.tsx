"use client";

// 로그인한 사용자에게만 안쪽 화면을 보여 준다. 로그인하지 않았으면 로그인 화면으로 보낸다.
// (화면에는 물건 정보가 들어 있지 않고, 정보는 로그인을 확인하는 API로만 받아 온다)
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import ScanLoader from "@/components/ScanLoader";
import { useSession } from "@/lib/useSession";

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session.status === "anon") router.replace("/login");
  }, [session.status, router]);

  if (session.status === "loading") {
    return <ScanLoader message="로그인 상태를 확인하는 중입니다..." />;
  }
  if (session.status === "anon") {
    return <ScanLoader message="로그인이 필요합니다. 로그인 화면으로 이동합니다..." />;
  }
  return <>{children}</>;
}
