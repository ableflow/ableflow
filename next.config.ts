import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libsql 네이티브 애드온을 서버 번들에서 외부화한다.
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
