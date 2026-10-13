# rust-web — ein Rust-Frontend auf der Cap

Testzweig mit genau einer App: einer Rust-App, die eine HTML-Seite und
eine kleine JSON-Route ausliefert, ohne Framework und ohne Abhängigkeiten.

| Pfad | Antwort |
|---|---|
| `/` | die HTML-Seite; ihr Knopf ruft `api/info` auf |
| `/api/info` | JSON mit App, Pfad und Betriebsart |
| `/health` | `{"ok":true,"app":"rust-web"}` |

**Auf der Cap** wird die App pro Anfrage gestartet: die rohe HTTP-Anfrage
liegt auf stdin, der Antwortrumpf geht nach stdout (wie die Dienste auf
`main`). **Lokal:** `PORT=8080 cargo run --release -- --serve`.
