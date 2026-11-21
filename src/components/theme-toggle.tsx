"use client";

import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "advero-theme";

export function ThemeToggle() {
  // Lazy initializer instead of an effect: the inline script in layout.tsx
  // already set the class on <html> before paint (so there's no flash), and
  // reading it here during the client's first render — rather than
  // synchronously setState-ing inside a useEffect — just syncs the icon to
  // match it without an extra render pass. On the server, `document` isn't
  // defined, so this falls back to false (dark); that's fine, the real
  // value is only needed once this renders in the browser.
  const [light, setLight] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("light")
  );

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
