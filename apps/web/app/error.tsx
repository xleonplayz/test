"use client"

// Last line of defence: if anything on the page throws, show a calm
// reload hint instead of an error screen.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main>
      <section className="card">
        <h2>One moment</h2>
        <p className="muted">This part is reloading.</p>
        <button onClick={() => reset()}>Reload</button>
      </section>
    </main>
  )
}
