import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "로그인 · 공매 매각결정 체크리스트",
};

export default function LoginPage() {
  return <LoginForm />;
}
