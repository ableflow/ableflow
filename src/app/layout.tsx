import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Disclaimer } from "@/components/Disclaimer";

export const metadata: Metadata = {
  title: "에이블로우 데스크 (AbleLaw Desk)",
  description: "국가법령정보 기반 법령·판례 조사 보조 도구 (로컬 전용)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10">
          <Disclaimer />
          <p className="mt-3 text-center text-xs text-slate-400">
            에이블로우 데스크 · 개인용 로컬 조사 도구 · 회원가입/외부 전송 없음
          </p>
        </footer>
      </body>
    </html>
  );
}
