//! Der Lagerdienst: welche Artikel es gibt und wie viele davon.
//!
//! ```text
//!   GET /health           {"ok":true,"app":"inventory"}
//!   GET /items            alle Artikel
//!   GET /items/<sku>      ein Artikel, oder {"error":"unknown sku"}
//!   GET /topology         wen er ruft (niemanden), wer ihn ruft (api)
//! ```
//!
//! # Zwei Betriebsarten, EIN Handler
//!
//! Auf der Cap wird die App **pro Anfrage** gestartet: die rohe
//! HTTP-Anfrage liegt auf stdin, was sie nach stdout schreibt, ist die
//! Antwort. Kein Listener — der lebte nur, solange der Lauf dauert, und
//! niemand naehme darauf eine Verbindung an.
//!
//! Auf einer Entwicklermaschine (und in `docker compose`) laeuft
//! dieselbe Datei mit `--serve` als gewoehnlicher HTTP-Server auf `PORT`.
//! Beide Wege rufen `antwort(method, path)` — es gibt keine zweite
//! Wahrheit darueber, was der Dienst sagt.
use std::io::Read;

/// Der Bestand. Im Code statt in einer Datenbank: auf der Cap gibt es
/// (noch) keine, und ein Dienst, der ohne sie nicht antworten kann,
/// beweist nichts ueber die Kette.
const ARTIKEL: &[(&str, &str, u32)] = &[
    ("lamp-01", "Schreibtischlampe", 12),
    ("desk-02", "Stehpult", 3),
    ("chair-03", "Buerostuhl", 0),
    ("cable-04", "USB-C-Kabel 2 m", 140),
];

fn artikel_json(sku: &str, name: &str, bestand: u32) -> serde_json::Value {
    serde_json::json!({ "sku": sku, "name": name, "stock": bestand, "available": bestand > 0 })
}

/// Die eine Wahrheit: Methode und Pfad hinein, JSON heraus.
fn antwort(method: &str, path: &str) -> serde_json::Value {
    let path = path.split('?').next().unwrap_or(path);
    match (method, path) {
        ("GET", "/health") | ("GET", "/") => serde_json::json!({ "ok": true, "app": "inventory" }),
        ("GET", "/items") => serde_json::json!({
            "app": "inventory",
            "items": ARTIKEL.iter().map(|(s, n, b)| artikel_json(s, n, *b)).collect::<Vec<_>>(),
        }),
        ("GET", "/topology") => serde_json::json!({
            "app": "inventory", "calls": [], "called_by": ["api"],
        }),
        ("GET", p) if p.starts_with("/items/") => {
            let sku = &p["/items/".len()..];
            match ARTIKEL.iter().find(|(s, _, _)| *s == sku) {
                Some((s, n, b)) => artikel_json(s, n, *b),
                None => serde_json::json!({ "error": "unknown sku", "sku": sku }),
            }
        }
        _ => serde_json::json!({ "error": "not found", "method": method, "path": path }),
    }
}

/// Die Anfragezeile aus einer rohen HTTP-Nachricht. Alles andere — Kopfzeilen,
/// Rumpf — braucht dieser Dienst nicht.
fn anfragezeile(roh: &str) -> (String, String) {
    let zeile = roh.lines().next().unwrap_or("");
    let mut teile = zeile.split_whitespace();
    let method = teile.next().unwrap_or("GET").to_string();
    let path = teile.next().unwrap_or("/").to_string();
    (method, path)
}

/// Cap-Modus: eine Anfrage von stdin, eine Antwort nach stdout, Ende.
fn einmal() {
    let mut roh = String::new();
    // Ein leerer oder unlesbarer stdin ist kein Fehler: dann ist es ein
    // Aufruf ohne Anfrage (etwa ein Smoke-Test), und `/` antwortet.
    let _ = std::io::stdin().read_to_string(&mut roh);
    let (method, path) = anfragezeile(&roh);
    println!("{}", antwort(&method, &path));
}

/// Entwicklermodus: ein HTTP-Server auf `PORT`, derselbe Handler.
#[cfg(not(target_os = "wasi"))]
fn serve() {
    use std::io::Write;
    let port = std::env::var("PORT").unwrap_or_else(|_| "8082".into());
    let listener = std::net::TcpListener::bind(format!("0.0.0.0:{port}")).expect("bind");
    eprintln!("inventory: listening on :{port}");
    for strom in listener.incoming().flatten() {
        let mut strom = strom;
        let mut puffer = [0u8; 8192];
        let n = strom.read(&mut puffer).unwrap_or(0);
        let (method, path) = anfragezeile(&String::from_utf8_lossy(&puffer[..n]));
        let body = antwort(&method, &path).to_string();
        let _ = write!(
            strom,
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
    }
}

#[cfg(target_os = "wasi")]
fn serve() {
    eprintln!("inventory: --serve gibt es auf der Cap nicht; dort laeuft der Dienst pro Anfrage");
    einmal();
}

fn main() {
    if std::env::args().any(|a| a == "--serve") {
        serve();
    } else {
        einmal();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn die_anfragezeile_wird_gelesen() {
        assert_eq!(anfragezeile("GET /items/lamp-01?x=1 HTTP/1.1\r\nHost: a\r\n\r\n"), ("GET".into(), "/items/lamp-01?x=1".into()));
        assert_eq!(anfragezeile(""), ("GET".into(), "/".into()));
    }

    #[test]
    fn ein_artikel_und_ein_unbekannter() {
        assert_eq!(antwort("GET", "/items/desk-02")["stock"], 3);
        assert_eq!(antwort("GET", "/items/nix")["error"], "unknown sku");
        assert_eq!(antwort("GET", "/items")["items"].as_array().unwrap().len(), ARTIKEL.len());
    }
}
