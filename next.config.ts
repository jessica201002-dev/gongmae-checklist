import type { NextConfig } from "next";

// 모든 경로에 붙는 보안 응답 머리글: 다른 사이트가 이 앱을 iframe으로 감싸는 것(클릭재킹)을 막고,
// 파일 종류 추측과 출처 정보 전달을 줄인다.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  // "X-Powered-By: Next.js" 머리글을 보내지 않는다
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
