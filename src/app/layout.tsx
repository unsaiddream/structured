import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SyllabusAI — Умный органайзер силлабусов",
  description: "Загружай силлабусы, получай структурированный обзор предметов, дедлайнов и оценок",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
