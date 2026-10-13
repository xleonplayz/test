//! Ein kleines Frontend in Rust: eine HTML-Seite und eine JSON-Route,
//! die die Seite selbst aufruft.
//!
//! ```text
//!   GET /            die Seite (HTML)
//!   GET /api/info    {"app":"rust-web","path":"/api/info",...}
//!   GET /health      {"ok":true,"app":"rust-web"}
//! ```
//!
//! # Zwei Betriebsarten, EIN Handler
//!
//! Auf der Cap: die rohe HTTP-Anfrage liegt auf stdin, was die App nach
//! stdout schreibt, ist der Antwortrumpf. Kein Listener.
//!
//! Lokal: `cargo run -- --serve` startet einen HTTP-Server auf `PORT`
//! (Standard 8080), mit echtem Status und `Content-Type`.
//! Beide Wege rufen `antwort(method, path)`.
use std::io::{BufRead, BufReader, Read, Write};

const SEITE: &str = r#"<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rust-Frontend auf der Cap</title>
<style>
  :root { --bg:#f6f7f9; --fg:#1d2330; --muted:#5b6475; --card:#fff; --accent:#c2410c; }
  @media (prefers-color-scheme: dark) { :root { --bg:#12151b; --fg:#e7eaf0; --muted:#9aa3b2; --card:#1b2029; --accent:#fb923c; } }
  body { margin:0; font:16px/1.5 system-ui,sans-serif; background:var(--bg); color:var(--fg); }
  main { max-width:640px; margin:48px auto; padding:0 16px; }
  .card { background:var(--card); border-radius:12px; padding:24px; box-shadow:0 1px 3px rgba(0,0,0,.08); }
  h1 { margin:0 0 8px; font-size:1.6rem; }
  p { color:var(--muted); }
  button { background:var(--accent); color:#fff; border:0; border-radius:8px; padding:10px 16px; font-size:1rem; cursor:pointer; }
  pre { background:var(--bg); border-radius:8px; padding:12px; overflow:auto; }
</style>
</head>
<body>
<main>
  <div class="card">
    <h1>Hallo von Rust</h1>
    <p>Diese Seite liefert eine Rust-App aus, die auf einer Cap pro Anfrage gestartet wird.</p>
    <button id="laden">API aufrufen</button>
    <pre id="ausgabe">noch nichts geladen</pre>
  </div>
</main>
<script>
  document.getElementById("laden").addEventListener("click", async () => {
    const ziel = document.getElementById("ausgabe");
    try {
      const r = await fetch("api/info");
      ziel.textContent = JSON.stringify(await r.json(), null, 2);
    } catch (e) {
      ziel.textContent = "Fehler: " + e;
    }
  });
</script>
</body>
</html>
"#;

/// Was eine Anfrage bekommt: Status, Content-Type, Rumpf.
struct Antwort {
    status: u16,
    typ: &'static str,
    rumpf: String,
}

fn json(status: u16, rumpf: String) -> Antwort {
    Antwort { status, typ: "application/json", rumpf }
}

/// Die eine Wahrheit: Methode und Pfad hinein, Antwort heraus.
fn antwort(method: &str, path: &str, modus: &str) -> Antwort {
    let pfad = path.split('?').next().unwrap_or(path);
    match (method, pfad) {
        ("GET", "/") | ("GET", "/index.html") => Antwort {
            status: 200,
            typ: "text/html; charset=utf-8",
            rumpf: SEITE.to_string(),
        },
        ("GET", "/health") => json(200, r#"{"ok":true,"app":"rust-web"}"#.to_string()),
        ("GET", "/api/info") => json(
            200,
            format!(r#"{{"app":"rust-web","path":"{pfad}","language":"rust","mode":"{modus}"}}"#),
        ),
        (_, "/") | (_, "/health") | (_, "/api/info") => {
            json(405, format!(r#"{{"error":"method not allowed","method":"{method}"}}"#))
        }
        _ => json(404, format!(r#"{{"error":"not found","path":"{pfad}"}}"#)),
    }
}

/// Methode und Pfad aus der Anfragezeile; eine leere Anfrage ist `GET /`.
fn anfragezeile(zeile: &str) -> (String, String) {
    let mut teile = zeile.split_whitespace();
    let method = teile.next().unwrap_or("GET").to_string();
    let path = teile.next().unwrap_or("/").to_string();
    (method, path)
}

/// Cap-Modus: eine Anfrage von stdin, der Rumpf nach stdout, Ende.
fn cap() {
    let mut roh = String::new();
    // Ein leerer oder unlesbarer stdin ist kein Fehler: dann ist es ein
    // Aufruf ohne Anfrage, und die Seite ist die Antwort.
    let _ = std::io::stdin().read_to_string(&mut roh);
    let (method, path) = anfragezeile(roh.lines().next().unwrap_or(""));
    print!("{}", antwort(&method, &path, "cap").rumpf);
}

/// Entwicklermodus: gewoehnlicher HTTP-Server auf `PORT`.
fn serve() {
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let listener = std::net::TcpListener::bind(format!("0.0.0.0:{port}")).expect("bind");
    eprintln!("rust-web: listening on :{port}");
    for verbindung in listener.incoming().flatten() {
        let mut zeile = String::new();
        if BufReader::new(&verbindung).read_line(&mut zeile).is_err() {
            continue;
        }
        let (method, path) = anfragezeile(&zeile);
        let a = antwort(&method, &path, "serve");
        let grund = if a.status == 200 { "OK" } else { "Error" };
        let mut schreiber = &verbindung;
        let _ = write!(
            schreiber,
            "HTTP/1.1 {} {grund}\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            a.status,
            a.typ,
            a.rumpf.len(),
            a.rumpf
        );
    }
}

fn main() {
    if std::env::args().any(|a| a == "--serve") {
        serve();
    } else {
        cap();
    }
}
