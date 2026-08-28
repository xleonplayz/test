# xleonplayz/test — vier Dienste, die miteinander reden

Ein Prüfstand für Erkennung, Bau und Rollout: **vier Apps in vier
Sprachen**, die ein kleines System bilden — eine Plattform, ein
Backend, zwei Fachdienste. Nicht viele, dafür verbunden.

```
   Browser ──▶ apps/web          Next.js 14 (App Router, SSR, dynamische
                 │               Routen, Route Handlers)         :3000
                 │  API_URL
                 ▼
              services/api       TypeScript — das Bindeglied      :8081
                 │  INVENTORY_URL        │  PRICING_URL
                 ▼                       ▼
        services/inventory        services/pricing
        Rust — Artikel, Bestand   C — Preis, Mengenrabatt
        :8082                     :8083
```

| Pfad | Sprache | Hafen | Ruft | Gerufen von |
|---|---|---|---|---|
| `apps/web` | Next.js 14 / TypeScript | 3000 | api | Browser |
| `services/api` | TypeScript | 8081 | inventory, pricing | web |
| `services/inventory` | Rust | 8082 | — | api |
| `services/pricing` | C | 8083 | — | api |

Jeder Dienst beantwortet `/health` und `/topology` (wen er ruft, von wem
er gerufen wird) — die Karte steht in den Diensten, nicht nur in der
Zeichnung oben.

## Wie das System zusammenhängt

**Die Plattform kennt eine Adresse.** `web` liest nur `API_URL`, und
zwar auf dem Server (Server Components, Route Handlers). Der Browser
spricht mit den eigenen Route Handlers unter `/api/*` — derselbe Origin,
kein CORS, und die Adresse von `api` landet nie im Browser-Bundle.

**Ein Bindeglied, nicht zwei Wege aus dem Browser.** `api` fragt
`inventory` und `pricing` und legt die Antworten zusammen: `/overview`
(Artikel, Preise, bepreiste Bestellungen), `/orders`, `/orders/<id>`
(bepreist und gegen den Bestand geprüft).

**Jede Schwester über ihre eigene Variable.** `API_URL`,
`INVENTORY_URL`, `PRICING_URL` — kein abgeleiteter Name. In compose, in
einer Zelle und auf der Cap liegen die Dienste an drei verschiedenen
Orten, und nur die Umgebung weiß, wo. Die Vorgaben in den
`.env.example` sind die compose-Namen (`http://inventory:8082`); genau
daran erkennt die Analyse die Kanten.

**Ein Teilausfall ist eine Antwort, kein Fehler.** Fällt `pricing` aus,
kommt die Übersicht trotzdem — Preise `null`, `"missing":["pricing"]`,
der Grund in `reasons`. Die Plattform zeigt dann „Teilausfall — es
fehlen: pricing" statt einer leeren Seite. `tools/smoke.sh` beweist
das, indem er `pricing` abschießt.

## Zwei Betriebsarten, EIN Handler

Das ist die wichtigste Eigenschaft dieses Repos. Auf der Cap wird eine
App **pro Anfrage** gestartet: die rohe HTTP-Anfrage liegt auf stdin,
und was sie nach stdout schreibt, ist die Antwort. Ein
`listen()` allein bringt dort nichts — der Listener lebt nur, solange
der Lauf dauert.

Deshalb hat jeder Dienst eine Funktion `antwort(method, path)` und zwei
dünne Hüllen darum:

| | Cap | Entwicklermaschine / compose |
|---|---|---|
| `inventory` | `inventory` (stdin → stdout) | `inventory --serve` |
| `pricing` | `pricing` (stdin → stdout) | `pricing --serve` |
| `api` | `tsx src/server.ts` (stdin → `console.log`) | `tsx src/server.ts --serve` |
| `web` | vom Compiler gebaut, Seiten + Route Handlers pro Anfrage | `next dev` / `next start` |

Was die Cap dabei vorgibt (Stand 27.08.2026):

- **`console.log`, nicht `process.stdout.write`** — nur `console.log`
  wird als Antwort gefangen.
- **Die Anfrage liest JS aus `/dev/stdin` — einmal, auf Modulebene.**
  `readFileSync("/dev/stdin", "utf8")` liefert den ganzen Rumpf, aber
  nur als Anweisung auf Modulebene (auch in einem `if`-Block); dieselbe
  Zeile in einer Funktion liefert `undefined`, und `readFileSync(0)`
  liefert immer `undefined` — beides ohne Ausnahme. Der zweite Leser
  bekommt einen leeren Strom. Und ein Methodenaufruf auf `undefined` ist
  auf der Cap ein **Trap** („Execution failed"), kein `TypeError`: wer
  `raw.split(...)` ohne Typprüfung schreibt, sieht 502 und keinen Log.
  Gemessen mit `nex-run` der Meryl-Kette; die Proben liegen in der
  Git-Historie dieses Absatzes.
- **Kein `require('path')`** in JS — der Compiler erzeugt dafür einen
  Import, den die in der Cap gepinnte Runtime nicht kennt.
- **Die Antwort ist immer `200 text/html`.** Statuscode und
  Content-Type kommen nicht aus der App; deshalb steht der Fehler IM
  Rumpf (`{"error":…}`), und `fetch(...).json()` funktioniert trotzdem.
- **Kein tokio/axum in Rust, kein libpq in C** — was für wasm32-wasi
  nicht gebaut werden kann, gehört nicht in eine App, die auf der Cap
  laufen soll. `inventory` kommt mit `std` und `serde_json` aus,
  `pricing` mit der C-Standardbibliothek; die `--serve`-Sockets sind
  unter `#ifndef __wasi__` bzw. `#[cfg(not(target_os = "wasi"))]`.

## Starten

```bash
docker compose up --build          # alle vier, mit Listenern
open http://localhost:3000

# oder ohne Docker:
npm install
npm run smoke                      # baut inventory + pricing, faehrt api an, prueft alles
cd apps/web && API_URL=http://127.0.0.1:8081 npm run dev
```

`npm run smoke` prüft die Einzelantworten, die zusammengelegte
Übersicht, den Teilausfall **und** den Cap-Modus (stdin → stdout) jedes
Dienstes.

## Auf der Cap ausrollen

Alle vier auswählen, dann **einmal** ausrollen. Die Fachdienste laufen
sofort; `api` und `web` melden bis dahin ehrlich „down: …", weil ihre
Schwestern noch keine Adresse haben. Danach die vergebenen Adressen in
die Umgebung tragen und erneut ausrollen:

| App | Variable | Wert |
|---|---|---|
| `services/api` | `INVENTORY_URL` | `https://<slug von inventory>.dev.lilylabs.app` |
| `services/api` | `PRICING_URL` | `https://<slug von pricing>.dev.lilylabs.app` |
| `apps/web` | `API_URL` | `https://<slug von api>.dev.lilylabs.app` |

Der Raptor füllt diese Werte **nicht** von selbst — er kennt die Kanten
(aus den `.env.example`), aber eine Kante ist eine Erlaubnis, keine
Adresse.

### Gemessen am 28.08.2026 (Projekt `vierdienste`, phoenix)

Alle vier erkannt (`nextjs`, `javascript`, `rust`, `cpp`), alle drei
Kanten aus den `.env.example` gefunden, alle vier gebaut und ausgerollt.
Dann, unter ihren Adressen:

| App | Slug | Antwort |
|---|---|---|
| `services/inventory` | `cometsnow` | `/items/lamp-01` → `{"stock":12,…}` — liest die Anfrage von stdin, routet |
| `services/pricing` | `kestrelworth` | `/price/desk-02?qty=3` → `{"discount_percent":5,"total_cents":156465}` |
| `apps/web` | `wolfspark` | `/`, `/orders`, `/orders/o-1002`, `/health` rendern (SSR); **`/api/*` liefert 0 Byte** |
| `services/api` | `bramblevine` | **502** — Trap beim Start (`Execution failed`) |

Zwei Grenzen der Cap, die dieses Repo sichtbar macht — beide liegen in
der Cap-Runtime, nicht in den Apps:

1. **JS-Apps haben auf der Cap weder `fs` noch `http` noch `fetch`.**
   Die Cap bindet `nex-runtime` ohne die „fremde Fläche"
   (`nex-host-node`); deren Vermittlung bleibt ohne angemeldete Handler
   „inert" (`host/dynamic/foreign_dispatch.rs`). `fetch()` liefert
   `undefined` (die Seite sagt dann ehrlich „no response"),
   `readFileSync` trappt. Eine JS-App kann die Anfrage nicht lesen und
   keine Schwester rufen — sie kann nur eine feste Antwort schreiben.
   `lly.app_call` gibt es nur für Wasm-Gäste (C/C++/Rust).
2. **Next.js Route Handlers (`app/api/*/route.ts`) antworten leer**,
   während Seiten (auch dynamische) rendern.

Lokal (`npm run smoke`, `docker compose up`) läuft die Kette
vollständig; unter `nex-run` der Meryl-Kette (mit fremder Fläche)
beantwortet `api` jeden Pfad richtig. Was fehlt, ist die Fläche auf der
Cap — eine Entscheidung, keine Reparatur an diesem Repo.

## Was dieser Prüfstand zutage gefördert hat

Die Vorgeschichte (Erkennung leerer Vorschläge für Rust/C++, die Wurzel
als neunte App, die Wasm-Fallen der ersten Fassung) steht in der
Git-Historie bis `d5c1174`. Was weiter gilt:

- **Die Analyse greppt Text, nicht Syntax.** Ein Muster in einem
  Kommentar ist ein Fund.
- **Ein Name, der durch eine Variable geht, ist unsichtbar.**
  `getenv(name)` findet nichts; die `.env.example` daneben schon.
- **`apps/web` hat keinen Port im Repo** — Next.js nimmt 3000, und die
  Zahl steht nirgends. Was nicht dasteht, kann nicht gefunden werden.
- **Die Wurzel zählt nicht mit** (`"workspaces"` in der `package.json`
  macht sie zum Behälter, nicht zur App).
- **Nur eine Ebene tief** unter `apps services packages …`.
