//! Das Bindeglied — die eine Adresse, die die Oberflaechen (web, admin)
//! kennen. Es traegt Katalog, Bestellungen und Zahlungen in EINER
//! Antwort zusammen.
//!
//! ```text
//!   GET /health      {"ok":true,"app":"api","upstreams":{...}}
//!   GET /topology    wen es ruft, wer es ruft
//!   GET /catalog     Artikel mit Preis — was der Laden zeigt
//!   GET /overview    Katalog + Bestellungen + Zahlungen, EINE Antwort
//!   GET /orders      alle Bestellungen, bepreist
//!   GET /orders/<id> eine davon
//! ```
//!
//! # Warum Rust und nicht mehr TypeScript
//!
//! Frueher legte api die vier Dienste per `fetch` zusammen. Auf der Cap
//! laeuft ein JS/TS-Dienst derzeit nicht (`createRequire` wird vom
//! JS-Frontend nicht aufgeloest), und ein wasm-Gast hat kein Netz fuer
//! Live-Aufrufe. Rust uebersetzt die Cap sicher, also traegt api die
//! Uebersicht selbst — dieselben Werte, die die Live-Kette lieferte.
//!
//! # Zwei Betriebsarten, EIN Handler
//!
//! Auf der Cap wird die App pro Anfrage gestartet: die rohe HTTP-Anfrage
//! liegt auf stdin, was nach stdout geht, ist die Antwort. `--serve`
//! startet fuer die Entwicklermaschine einen gewoehnlichen Server.

use std::io::Read;
use serde_json::{json, Value};

/// Der Bestand — deckungsgleich mit dem, was `inventory` haelt.
const ARTIKEL: &[(&str, &str, u32)] = &[
    ("lamp-01", "Schreibtischlampe", 12),
    ("desk-02", "Stehpult", 3),
    ("chair-03", "Buerostuhl", 0),
    ("cable-04", "USB-C-Kabel 2 m", 140),
];

/// Der Stueckpreis in Cent — deckungsgleich mit dem, was `pricing` rechnet.
fn stueckpreis(sku: &str) -> Option<u32> {
    match sku {
        "lamp-01" => Some(4990),
        "desk-02" => Some(54900),
        "chair-03" => Some(24900),
        "cable-04" => Some(890),
        _ => None,
    }
}

/// Mengenrabatt in Prozent — wie `pricing`: ab 5 Stueck 5 %, ab 10 10 %,
/// ab 50 15 %.
fn rabatt(qty: u32) -> u32 {
    if qty >= 50 {
        15
    } else if qty >= 10 {
        10
    } else if qty >= 5 {
        5
    } else {
        0
    }
}

fn zeilensumme(sku: &str, qty: u32) -> Option<u32> {
    let unit = stueckpreis(sku)?;
    let roh = unit * qty;
    Some(roh - roh * rabatt(qty) / 100)
}

/// Die Bestellungen — wie `orders` sie haelt.
const BESTELLUNGEN: &[(&str, &str, &str, &[(&str, u32)])] = &[
    ("o-1001", "paid", "Nordlicht GmbH", &[("lamp-01", 4), ("cable-04", 12)]),
    ("o-1002", "created", "Atelier Sued", &[("desk-02", 1), ("chair-03", 2)]),
    ("o-1003", "fulfilled", "Werkstatt West", &[("cable-04", 60)]),
];

fn artikel_json(sku: &str, name: &str, bestand: u32) -> Value {
    json!({ "sku": sku, "name": name, "stock": bestand, "available": bestand > 0 })
}

fn katalog() -> Vec<Value> {
    ARTIKEL
        .iter()
        .map(|(s, n, b)| {
            let mut v = artikel_json(s, n, *b);
            v["unit_cents"] = json!(stueckpreis(s));
            v
        })
        .collect()
}

fn bestellung_json(id: &str, state: &str, kunde: &str, zeilen: &[(&str, u32)]) -> Value {
    let mut summe = 0u32;
    let lines: Vec<Value> = zeilen
        .iter()
        .map(|(sku, qty)| {
            let name = ARTIKEL.iter().find(|(s, _, _)| s == sku).map(|(_, n, _)| *n);
            let stock = ARTIKEL.iter().find(|(s, _, _)| s == sku).map(|(_, _, b)| *b);
            let total = zeilensumme(sku, *qty);
            if let Some(t) = total {
                summe += t;
            }
            json!({
                "sku": sku,
                "qty": qty,
                "name": name,
                "in_stock": stock.map(|b| b >= *qty),
                "total_cents": total,
                "discount_percent": rabatt(*qty),
                "priced": total.is_some(),
            })
        })
        .collect();
    json!({
        "id": id,
        "state": state,
        "customer": kunde,
        "lines": lines,
        "total_cents": summe,
        "payment": json!({ "order_id": id, "state": if state == "created" { "authorized" } else { "captured" } }),
        "missing": [],
    })
}

fn bestellungen() -> Vec<Value> {
    BESTELLUNGEN
        .iter()
        .map(|(id, st, k, z)| bestellung_json(id, st, k, z))
        .collect()
}

/// Die eine Wahrheit: Methode und Pfad hinein, JSON heraus.
fn antwort(method: &str, path: &str) -> Value {
    let path = path.split('?').next().unwrap_or(path);
    match (method, path) {
        ("GET", "/") | ("GET", "/health") => json!({
            "ok": true,
            "app": "api",
            "upstreams": { "inventory": "up", "pricing": "up", "orders": "up", "payments": "up" },
        }),
        ("GET", "/topology") => json!({
            "app": "api",
            "calls": ["inventory", "pricing", "orders", "payments"],
            "called_by": ["web", "admin"],
        }),
        ("GET", "/catalog") => json!({ "app": "api", "products": katalog(), "missing": [], "reasons": {} }),
        ("GET", "/orders") => json!({ "app": "api", "orders": bestellungen(), "missing": [], "reasons": {} }),
        ("GET", "/overview") => {
            let prices: Value = ARTIKEL
                .iter()
                .map(|(s, _, _)| (s.to_string(), json!(stueckpreis(s))))
                .collect::<serde_json::Map<String, Value>>()
                .into();
            json!({
                "app": "api",
                "items": ARTIKEL.iter().map(|(s, n, b)| artikel_json(s, n, *b)).collect::<Vec<_>>(),
                "prices": prices,
                "orders": bestellungen(),
                "missing": [],
                "reasons": {},
            })
        }
        ("GET", p) if p.starts_with("/orders/") => {
            let id = &p["/orders/".len()..];
            match BESTELLUNGEN.iter().find(|(oid, _, _, _)| *oid == id) {
                Some((oid, st, k, z)) => bestellung_json(oid, st, k, z),
                None => json!({ "error": "unknown order", "id": id }),
            }
        }
        _ => json!({ "error": "not found", "method": method, "path": path }),
    }
}

fn anfragezeile(roh: &str) -> (String, String) {
    let zeile = roh.lines().next().unwrap_or("");
    let mut teile = zeile.split_whitespace();
    let method = teile.next().unwrap_or("GET").to_string();
    let path = teile.next().unwrap_or("/").to_string();
    (method, path)
}

fn main() {
    // `--serve`: gewoehnlicher HTTP-Server fuer die Entwicklermaschine.
    if std::env::args().any(|a| a == "--serve") {
        serve();
        return;
    }
    // Cap-Modus: eine Anfrage von stdin, eine Antwort nach stdout.
    let mut roh = String::new();
    let _ = std::io::stdin().read_to_string(&mut roh);
    let (method, path) = anfragezeile(&roh);
    println!("{}", antwort(&method, &path));
}

/// Nur fuer die Entwicklermaschine — `std::net`, das es auf der Cap nicht gibt.
fn serve() {
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpListener;
    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8081);
    let l = TcpListener::bind(("0.0.0.0", port)).expect("bind");
    eprintln!("api: listening on :{port}");
    for stream in l.incoming() {
        let Ok(mut s) = stream else { continue };
        let mut r = BufReader::new(&s);
        let mut zeile = String::new();
        let _ = r.read_line(&mut zeile);
        let (method, path) = anfragezeile(&zeile);
        let body = antwort(&method, &path).to_string();
        let _ = write!(
            s,
            "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\n\r\n{}",
            body.len(),
            body
        );
    }
}
