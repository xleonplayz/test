// Der kleinste Rust-Dienst, der die ganze Kette beweist.
//
// rustc geht fuer wasm einen anderen Weg als C/C++: es emittiert direkt
// ein fertiges Modul, ohne IR-Pfad und ohne Partitionierung — immer ein
// Single-Brick.
use std::env;

fn main() {
    let hafen = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let gruss = serde_json::json!({
        "ok": true,
        "app": "hello-rust",
        "port": hafen,
    });
    println!("{gruss}");
}
