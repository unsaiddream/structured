import type { Metadata } from "next";
import "./globals.css";
import DotGrid from "@/components/DotGrid";

export const metadata: Metadata = {
  title: "structured — AI syllabus organizer",
  description: "Upload syllabuses, get a clean structured overview of subjects, deadlines and grades",
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
      <body className="min-h-full flex flex-col">
        <DotGrid />
        <div className="relative flex flex-col min-h-full" style={{ zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
