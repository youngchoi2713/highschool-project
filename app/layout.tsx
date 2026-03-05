import type { Metadata } from "next";
import "./globals.css";
import SessionTimeoutGuard from "@/components/auth/SessionTimeoutGuard";

export const metadata: Metadata = {
  title: "교칙 위반 관리 시스템",
  description: "학교 교칙 위반 기록 및 관리 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <SessionTimeoutGuard />
        {children}
      </body>
    </html>
  );
}
