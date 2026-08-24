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
// Der Node-Teil bleibt trotzdem stehen: er beweist, dass die fremde
// Node-Flaeche (`require('http')` → `runtime::load_node_builtin`) in
// der Cap geladen ist. Ohne sie starb dieses Modul frueher schon beim
// Instanziieren.

const http = require('http');
const path = require('path');

const antwort = {
  ok: true,
  app: 'hello-js',
  node: typeof http.createServer === 'function',
  pfad: path.join('/', 'hello-js'),
  port: String(process.env.PORT || 8080),
};

process.stdout.write(JSON.stringify(antwort));
