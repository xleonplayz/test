/**
 * Local quotes. The page shows these whenever the backend is not reachable,
 * so the app stays fully usable on its own.
 */
export const LOCAL_QUOTES: string[] = [
  "Simple things should be simple, complex things should be possible.",
  "Make it work, make it right, make it fast.",
  "The best error message is the one that never shows up.",
  "First, solve the problem. Then, write the code.",
  "Small steps, often.",
]

export type BackendQuote = {
  source: "backend"
  text: string
  index: number
  total: number
}

export type QuoteResult = BackendQuote | { source: "local" }
