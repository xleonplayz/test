//! Was sieht eine WASI-App auf der Cap wirklich?
//!
//! Diese App entscheidet nichts und ruft niemanden. Sie schreibt auf,
//! was in ihrer Umgebung steht, was in argv steht und was auf stdin
//! ankam. Damit ist die Frage „kommt die Umgebung an?" eine Messung
//! statt einer Vermutung.
//!
//! `API_URL` und `SONDE_ZIEL` werden ausdruecklich einzeln gelesen —
//! die Analyse des Raptors findet Variablennamen im Quelltext, und nur
//! was sie findet, schlaegt sie zur Konfiguration vor.
use std::io::Read;

fn main() {
    let mut roh = String::new();
    let _ = std::io::stdin().read_to_string(&mut roh);
    let erste = roh.lines().next().unwrap_or("").to_string();

    // Einzeln gelesen, damit die Analyse die Namen findet.
    let api_url = std::env::var("API_URL");
    let sonde_ziel = std::env::var("SONDE_ZIEL");
    let port = std::env::var("PORT");

    let alle: Vec<serde_json::Value> = std::env::vars()
        .map(|(k, v)| serde_json::json!({ "name": k, "wert": v }))
        .collect();

    let wie = |r: &Result<String, std::env::VarError>| match r {
        Ok(w) => serde_json::json!({ "gesetzt": true, "wert": w, "leer": w.is_empty() }),
        Err(_) => serde_json::json!({ "gesetzt": false }),
    };

    let aus = serde_json::json!({
        "app": "sonde",
        "anfrage": erste,
        "umgebung_anzahl": alle.len(),
        "umgebung": alle,
        "API_URL": wie(&api_url),
        "SONDE_ZIEL": wie(&sonde_ziel),
        "PORT": wie(&port),
        "argv": std::env::args().collect::<Vec<_>>(),
    });
    println!("{aus}");
}
