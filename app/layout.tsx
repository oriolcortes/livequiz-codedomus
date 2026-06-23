import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "LiveQuiz by CodeDomus",
  description: "Quizzes en directe, efímers i sense guardar preguntes a la base de dades.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "LiveQuiz by CodeDomus",
    description: "Crea quizzes en directe amb JSON local, Supabase Realtime i límits de fair use.",
    images: ["/livequiz-logo.png"]
  }
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  colorScheme: "light"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ca">
      <body>
        <Header />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16">{children}</main>
      </body>
    </html>
  );
}
