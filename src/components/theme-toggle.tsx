"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "advero-theme";

export function ThemeToggle() {
  // Starts false (dark) to match the server-rendered class; the effect below
  // reconciles with localStorage right after mount (the inline script in
  // layout.tsx already set the class on <html> before paint, so there's no
  // flash — this just syncs the icon/state to match it).
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    setLight((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("light", next);
      window.localStorage.setItem(STORAGE_KEY, next ? "light" : "dark");
      return next;
    });
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={toggle}
      aria-label={light ? "Switch to dark background" : "Switch to white background"}
      title={light ? "Switch to dark background" : "Switch to white background"}
      className="shrink-0"
    >
      {light ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
    </Button>
  );
}
