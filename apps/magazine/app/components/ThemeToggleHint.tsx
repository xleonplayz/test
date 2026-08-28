"use client";

import { useEffect, useState } from "react";

/**
 * A tiny client component that reports the OS-preferred color scheme.
 * The actual theming is driven entirely by CSS `prefers-color-scheme`;
 * this just surfaces the current mode as an accessible hint and exercises
 * the client/effect path of the compiler.
 */
export default function ThemeToggleHint() {
  const [mode, setMode] = useState<"light" | "dark" | "unknown">("unknown");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setMode(mq.matches ? "dark" : "light");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const label =
    mode === "unknown" ? "Auto theme" : `${mode === "dark" ? "Dark" : "Light"} mode`;

  return (
    <span
      className="muted"
      style={{ fontSize: "0.78rem" }}
      aria-live="polite"
      title="Theme follows your system setting"
    >
      {label}
    </span>
  );
}
