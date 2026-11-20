import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Advero — Ad Swipe-File Archive",
  description:
    "Every ad your seed accounts received, checked across Meta, TikTok and LinkedIn — searchable, tagged, and alertable.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
