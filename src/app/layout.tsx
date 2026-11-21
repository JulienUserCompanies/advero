import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Advero — Ad Swipe-File Archive",
  description:
    "Every ad your seed accounts received, checked across Meta, TikTok and LinkedIn — searchable, tagged, and alertable.",
};

// Runs before paint so the saved background preference applies with no
// flash of the wrong theme (a plain useEffect in the toggle would run after
// the dark-themed first paint).
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("advero-theme");if(t==="light"){document.documentElement.classList.add("light")}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
