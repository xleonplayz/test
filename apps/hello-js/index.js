// Der kleinste Dienst, der die ganze Kette beweist.
//
// **Der Vertrag der Cap ist: was die App nach stdout schreibt, ist die
// Antwort.** Die App wird pro Anfrage gestartet, schreibt und endet —
// so wie es die C-, C++- und Rust-Proben auch tun. Ein
// `http.createServer(...).listen(...)` allein reicht NICHT: der
// Listener existiert nur, solange der Lauf dauert, und niemand nimmt
// darauf eine Verbindung an. Genau so kam vorher eine 200 mit null
// Bytes zurueck — die App lief, sie sagte nur nichts.
//
// `require('http')` bleibt stehen: es beweist, dass die fremde
// Node-Flaeche (`runtime::load_node_builtin`) in der Cap geladen ist.
//
// **`require('path')` steht bewusst NICHT hier.** Der Compiler in der
// Bauzelle erzeugt dafuer `runtime::path_normalize_posix`, und die im
// Cap gepinnte Runtime kennt diesen Import nicht — der Bau ist gruen,
// die App stirbt beim Instanziieren. Das ist eine Drift zwischen
// Compiler und Laufzeit, kein Fehler dieser Datei.

const http = require('http');

process.stdout.write(JSON.stringify({
  ok: true,
  app: 'hello-js',
  node: typeof http.createServer === 'function',
  port: String(process.env.PORT || 8080),
}));
