"use client"

import { useEffect, useState } from "react"
import { LOCAL_QUOTES, type QuoteResult } from "@/lib/quotes"

type Note = { id: number; text: string; done: boolean }

type Quote = { text: string; fromBackend: boolean }

export default function Playground() {
  const [count, setCount] = useState(0)
  const [notes, setNotes] = useState<Note[]>([])
  const [draft, setDraft] = useState("")
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [quote, setQuote] = useState<Quote>({ text: LOCAL_QUOTES[0], fromBackend: false })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void loadQuote(quoteIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteIndex])

  async function loadQuote(i: number) {
    setLoading(true)
    const local: Quote = { text: LOCAL_QUOTES[i % LOCAL_QUOTES.length], fromBackend: false }
    let next = local
    try {
      const res = await fetch(`/api/backend?i=${i}`, { cache: "no-store" })
      const data = JSON.parse(await res.text()) as QuoteResult
      if (data && data.source === "backend" && typeof data.text === "string") {
        next = { text: data.text, fromBackend: true }
      }
    } catch {
      // Silent: the local quote is shown instead.
    }
    setQuote(next)
    setLoading(false)
  }

  function addNote() {
    const text = draft.trim()
    if (!text) return
    setNotes((n) => [...n, { id: Date.now(), text, done: false }])
    setDraft("")
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>Counter</h2>
        <p className="big">{count}</p>
        <div className="row">
          <button onClick={() => setCount((c) => c - 1)}>−</button>
          <button onClick={() => setCount(0)} className="ghost">
            Reset
          </button>
          <button onClick={() => setCount((c) => c + 1)}>+</button>
        </div>
      </section>

      <section className="card">
        <h2>Notes</h2>
        <div className="row">
          <input
            value={draft}
            placeholder="Write something…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addNote()
            }}
          />
          <button onClick={addNote}>Add</button>
        </div>
        {notes.length === 0 ? (
          <p className="muted">No notes yet.</p>
        ) : (
          <ul className="notes">
            {notes.map((n) => (
              <li key={n.id} className={n.done ? "done" : ""}>
                <label>
                  <input
                    type="checkbox"
                    checked={n.done}
                    onChange={() =>
                      setNotes((all) => all.map((x) => (x.id === n.id ? { ...x, done: !x.done } : x)))
                    }
                  />
                  {n.text}
                </label>
                <button className="ghost" onClick={() => setNotes((all) => all.filter((x) => x.id !== n.id))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card wide">
        <h2>Quote of the moment</h2>
        <blockquote className={loading ? "fading" : ""}>“{quote.text}”</blockquote>
        <div className="row spread">
          <span className="pill">{quote.fromBackend ? "from the backend app" : "built in"}</span>
          <button onClick={() => setQuoteIndex((i) => i + 1)} disabled={loading}>
            Next quote
          </button>
        </div>
      </section>
    </div>
  )
}
