// Eine statische Seite, mit Absicht.
//
// `apps/docs` ist eine fumadocs-Anwendung mit Next 16, MDX und i18n —
// dort scheitert das Rendern beider Seiten mit 500, und der Compiler
// meldet ehrlich __NEX_VOID_PARTIAL_DEPLOY__. Diese hier hat nichts,
// was beim Rendern fehlschlagen koennte.
export default function Home() {
  return (
    <main>
      <h1>hello-next</h1>
      <p>Diese Seite kommt aus einem Wasm-Brick auf einer Cap.</p>
    </main>
  );
}
