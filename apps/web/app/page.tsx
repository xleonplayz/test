import Playground from "@/components/playground"

export default function Page() {
  return (
    <main>
      <header>
        <h1>Two Apps</h1>
        <p className="muted">
          A small Next.js frontend that talks to a separate backend app. Everything here also works on
          its own.
        </p>
      </header>
      <Playground />
    </main>
  )
}
