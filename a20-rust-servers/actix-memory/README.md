# actix-memory

Eigenständige rust-Anwendung. Aufgaben mit Prioritäten und Fortschritt.

```sh
cargo build --locked
./target/debug/fokus
cargo test --locked
```

Standardport 8080, über PORT konfigurierbar. Lokaler Start bindet an 127.0.0.1; HOST kann explizit gesetzt werden. Keine Laufzeit-Abhängigkeit von einem Nachbarprojekt.
