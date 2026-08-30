//! ruf — der Rufende im App-zu-App-Beweis.
//!
//! ```text
//!   GET /health      {"ok":true,"app":"ruf"}
//!   GET /via-echo    ruft `echo` ueber lly.app_call und gibt dessen Antwort zurueck
//! ```
//!
//! # Warum `lly.app_call` und nicht `fetch`
//!
//! Der Aufruf nennt **kein** Host und **keinen** Port, sondern die
//! Identitaet der Ziel-App. Wo sie liegt, entscheidet die Cap; ob der Ruf
//! erlaubt ist, entscheidet der Netz-Snapshot des Projekts (default-deny).
//! Der Ruf verlaesst die Maschine nicht.
//!
//! Die Identitaet steht in `ECHO_APP`. Sie kommt aus der Umgebung, weil
//! eine App ihre Schwestern nicht erraten darf: was sie rufen darf, sagt
//! ihr der, der sie ausgerollt hat.
//!
//! # Die Rueckgabe ist ein `i32`, und negativ heisst Fehler
//!
//! Positiv ist die Zahl der geschriebenen Bytes. Die Codes stehen im
//! Vertrag der Runtime (`v2/host/app_call.rs`) und werden hier NICHT neu
//! erfunden, sondern benannt:
//!
//!   -1 kein Vermittler   -2 Speicher   -3 Regel hat abgelehnt
//!   -4 zu tief           -5 Kreis      -6 Puffer zu klein   -7 Ziel gescheitert
//!
//! `-3` ist der Beweis, dass die Kantenpruefung wirkt: ohne Kante im
//! Snapshot kommt genau dieser Wert, nicht etwa eine Antwort.

use std::io::Read;

/// Der Puffer fuer die Antwort des Gerufenen. Grosszuegig, aber endlich:
/// ein `-6` waere eine ehrliche Absage und kein abgeschnittener Text.
///
/// Nur auf der Cap: ausserhalb gibt es die Naht nicht, und eine Konstante
/// ohne Verwendung waere eine Warnung, die nichts meldet.
#[cfg(target_os = "wasi")]
const AUS_KAPAZITAET: usize = 64 * 1024;

#[cfg(target_os = "wasi")]
#[link(wasm_import_module = "lly")]
extern "C" {
    /// `app_call(ziel_ptr, ziel_len, ein_ptr, ein_len, aus_ptr, aus_kap) -> i32`
    fn app_call(
        ziel_ptr: i32,
        ziel_len: i32,
        ein_ptr: i32,
        ein_len: i32,
        aus_ptr: i32,
        aus_kap: i32,
    ) -> i32;
}

/// Was ein Code bedeutet — fuer Menschen, die die Antwort lesen.
fn code_bedeutung(code: i32) -> &'static str {
    match code {
        -1 => "kein Vermittler: die Runtime hat lly.app_call nicht registriert",
        -2 => "Speicherfehler beim Lesen oder Schreiben",
        -3 => "abgelehnt: keine Kante im Netz-Snapshot",
        -4 => "zu tief: die Aufrufkette ist am Limit",
        -5 => "Kreis: das Ziel ist schon in der Kette",
        -6 => "Puffer zu klein fuer die Antwort",
        -7 => "das Ziel wurde gerufen und ist gescheitert",
        _ => "ok",
    }
}

/// Der Aufruf selbst. Gibt `(code, antwort)` zurueck; bei negativem Code
/// ist die Antwort leer.
#[cfg(target_os = "wasi")]
fn rufe(ziel: &str, eingabe: &[u8]) -> (i32, Vec<u8>) {
    let mut aus = vec![0u8; AUS_KAPAZITAET];
    let code = unsafe {
        app_call(
            ziel.as_ptr() as i32,
            ziel.len() as i32,
            eingabe.as_ptr() as i32,
            eingabe.len() as i32,
            aus.as_mut_ptr() as i32,
            aus.len() as i32,
        )
    };
    if code < 0 {
        return (code, Vec::new());
    }
    aus.truncate(code as usize);
    (code, aus)
}

/// Ausserhalb der Cap gibt es die Naht nicht. Ein ehrliches `-1` ist
/// besser als ein Nachbau, der etwas anderes tut als das Original.
#[cfg(not(target_os = "wasi"))]
fn rufe(_ziel: &str, _eingabe: &[u8]) -> (i32, Vec<u8>) {
    (-1, Vec::new())
}

fn anfragezeile(roh: &str) -> (String, String) {
    let erste = roh.lines().next().unwrap_or("");
    let mut teile = erste.split_whitespace();
    let method = teile.next().unwrap_or("GET").to_string();
    let path = teile.next().unwrap_or("/").to_string();
    (method, path)
}

fn antwort(method: &str, voller_pfad: &str) -> serde_json::Value {
    // Die Abfrage bleibt erhalten: sie ist die Marke, die durch den
    // Aufruf hindurch wiederauftauchen muss.
    let (path, abfrage) = match voller_pfad.split_once('?') {
        Some((p, q)) => (p, q),
        None => (voller_pfad, ""),
    };
    match (method, path) {
        ("GET", "/health") => serde_json::json!({"ok": true, "app": "ruf"}),
        ("GET", "/topology") => serde_json::json!({
            "app": "ruf", "calls": ["echo"], "called_by": [], "kanal": "lly.app_call"
        }),
        ("GET", "/via-echo") => {
            let ziel = std::env::var("ECHO_APP").unwrap_or_default();
            if ziel.is_empty() {
                return serde_json::json!({
                    "app": "ruf",
                    "ok": false,
                    "grund": "ECHO_APP ist nicht gesetzt — ohne Identitaet gibt es kein Ziel",
                });
            }
            // Eine vollstaendige Anfragezeile, damit der Gerufene sie
            // genauso liest wie eine von aussen.
            //
            // Die Marke ist die Abfrage der EIGENEN Anfrage. Damit haengt
            // die Antwort des Gerufenen an dem, was der Besucher gerufen
            // hat: `/via-echo?marke=abc` muss `/echo?marke=abc`
            // zurueckbringen. Eine Marke, die die App selbst erzeugt,
            // koennte auch aus einer alten Antwort stammen.
            //
            // KEIN `std::process::id()`: das gibt es auf WASI nicht und
            // endet in `abort` — gemessen am 30.08.2026, die App trappte
            // und das Gate meldete 502.
            let marke = if abfrage.is_empty() {
                "/echo?marke=ohne".to_string()
            } else {
                format!("/echo?{abfrage}")
            };
            let eingabe = format!("GET {marke} HTTP/1.1\r\nHost: echo\r\n\r\n");
            let (code, aus) = rufe(&ziel, eingabe.as_bytes());
            serde_json::json!({
                "app": "ruf",
                "ok": code >= 0,
                "ziel": ziel,
                "gesendet": marke,
                "code": code,
                "bedeutung": code_bedeutung(code),
                "antwort": String::from_utf8_lossy(&aus).trim().to_string(),
            })
        }
        ("GET", _) => serde_json::json!({"error": "not found", "path": path}),
        _ => serde_json::json!({"error": "method not allowed", "method": method}),
    }
}

/// Cap-Modus: eine Anfrage von stdin, eine Antwort nach stdout, Ende.
fn einmal() {
    let mut roh = String::new();
    let _ = std::io::stdin().read_to_string(&mut roh);
    let (method, path) = anfragezeile(&roh);
    println!("{}", antwort(&method, &path));
}

#[cfg(not(target_os = "wasi"))]
fn serve() {
    use std::io::Write;
    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8085);
    let lauscher = match std::net::TcpListener::bind(("0.0.0.0", port)) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("ruf: {port} nicht bindbar: {e}");
            return;
        }
    };
    eprintln!("ruf: listening on :{port}");
    for strom in lauscher.incoming().flatten() {
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
    eprintln!("ruf: --serve gibt es auf der Cap nicht; dort laeuft der Dienst pro Anfrage");
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
        assert_eq!(
            anfragezeile("GET /via-echo HTTP/1.1\r\nHost: a\r\n\r\n"),
            ("GET".into(), "/via-echo".into())
        );
        assert_eq!(anfragezeile(""), ("GET".into(), "/".into()));
    }

    /// Die Marke des Besuchers muss unveraendert in den Aufruf gehen —
    /// sonst beweist die Antwort nur, dass IRGENDEIN Ruf durchkam.
    #[test]
    fn die_marke_des_besuchers_reist_mit() {
        std::env::set_var("ECHO_APP", "app_test");
        let a = antwort("GET", "/via-echo?marke=abc");
        assert_eq!(a["gesendet"], "/echo?marke=abc");
        std::env::remove_var("ECHO_APP");
    }

    #[test]
    fn ohne_ziel_sagt_die_antwort_warum() {
        std::env::remove_var("ECHO_APP");
        let a = antwort("GET", "/via-echo");
        assert_eq!(a["ok"], false);
        assert!(a["grund"].as_str().unwrap().contains("ECHO_APP"));
    }

    /// Die Codes sind der Vertrag der Runtime. Wer sie hier umbenennt,
    /// macht aus einer Absage der Regel eine Absage des Ziels.
    #[test]
    fn die_codes_heissen_wie_im_vertrag() {
        assert!(code_bedeutung(-3).contains("Kante"));
        assert!(code_bedeutung(-7).contains("Ziel"));
        assert_eq!(code_bedeutung(12), "ok");
    }
}
