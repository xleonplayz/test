# Testfälle für volle Abdeckung (Use Cases aus Prod, 17.11.2026)

Für einen Agenten, der daraus Tests baut. Jeder Fall nennt, was getestet wird, was erwartet ist und woher er kommt. Die Herkunft ist entweder ein echter Vorfall vom 15. bis 17.11. oder eine bekannte Lücke.

**Regeln für den Testbau:**
- Wo möglich als Truman-Szenario (`remote-truman --only …`), sonst als Unit- oder Integrationstest im jeweiligen Repo.
- Jeder Fall braucht eine Gegenprobe: Ohne den Fix muss er rot sein.
- Fixtures sind Nachbauten. Private Nutzer-Repos nicht klonen.
- Prüfungen immer von außen: HTTP-Status, Inhalt, Logzeile. „deployed“ allein reicht nie, gefordert ist „antwortet richtig“.

**Priorität:**
- **P0** ist in Prod schon passiert oder trifft viele Nutzer.
- **P1** ist eine wichtige Lücke.
- **P2** ist Vollständigkeit.

---

## A. Frameworks und Sprachen: Erkennung, Build, Start

| # | Fall | Erwartet | Herkunft | P |
|---|---|---|---|---|
| A1 | Next.js App Router, statisch und dynamisch, auf Wasm | `/`, dynamische Route, API-Route 200 | Grundfall | P0 |
| A2 | Next.js Pages Router | geht auf Node, läuft, `/api/*` 200 | slug121 | P0 |
| A3 | Next.js mit Middleware bzw. Proxy, Redirect auf `/login` | 307 auf `/login`, Login-Seite 200 | Milans Dataroom | P0 |
| A4 | Next.js mit statischem Bild-Import aus `public/` (`import x from "@/public/a.png"`, auch `next/image` mit statischem Import) | Wasm-Build ok, Seite rendert | Milan (`public_obelisk::default is not defined`) | P0 |
| A5 | Next.js mit `try { await } catch { await } finally {}` (z. B. `@supabase/auth-js`) | Wasm-Build ok | sapphirelark | P0 |
| A6 | Next.js mit `fs/promises`-Lesezugriff zur Laufzeit (JSON-Dateien) | geht auf Node, liefert Daten (kein 500) | slug116 | P0 |
| A7 | Next.js mit `NEXT_PUBLIC_*` als normale Variable und als Secret | Wert beim Build eingebettet, im Log maskiert, Warnhinweis bei Secret | sapphirelark | P0 |
| A8 | Next.js Hash-Navigation: Klick `#anker`, Zurück/Vor zwischen Ankern, Direktaufruf `/#faq`, Soft-Navigation `/seite#abschnitt` | kein Neuladen, scrollt zum Ziel, Client-Zustand bleibt | Jan wolfrock | P0 |
| A9 | Next.js 16 mit Turbopack-Ausgabe | baut und läuft | Jan tally | P1 |
| A10 | Nuxt 3/4 (Nitro-Ausgabe, ESM-only `node_modules` in `.output/server`) | Startprüfung findet die Pakete, läuft | canary17 c046 | P0 |
| A11 | Vite-SPA statisch, Astro statisch | wird statisch ausgeliefert | `static_shipping` | P1 |
| A12 | Bun-Server mit `Bun.serve` (`fetch`, `routes`, `:params`, Wildcards, HTML-Import, Tailwind über `bun-plugin-tailwind`) | läuft auf Node, `/`, Unterpfad, API GET/PUT/Param 200, CSS und JS laden | Robin testapp | P0 |
| A13 | Bun-Server: Assets auf Unterpfaden (`/a/b/c` lädt `chunk-*.css`) | Assets 200 (absolute URLs) | Robin walnutbrook | P0 |
| A14 | Bun mit nicht abgedeckter API (`bun:sqlite`, `Bun.spawn`, `$` aus `bun`, WebSocket) | Build scheitert mit klarer Meldung, die die API nennt | BUNCOMPAT | P1 |
| A15 | Bun-Projekt mit `bun.lock` (Install über bun) und mit `package-lock.json` | beide Wege bauen gleich | BUNCOMPAT (offen) | P1 |
| A16 | TypeScript-Server über `tsx` (Start-Skript `NODE_ENV=production tsx src/index.ts`) | `tsx` samt esbuild im Paket, Start ok | Robin cacher | P0 |
| A17 | Express, Koa, Hono, Fastify, Node-HTTP (`node server.js`) | 200 | canary c002, c018 | P1 |
| A18 | Node-App ohne Startbefehl (kein `scripts.start`, kein `main`) | Build scheitert mit klarer Meldung | slug40 | P1 |
| A19 | Node-App mit `appendFileSync` bzw. Dateischreiben | geht auf Node, nicht auf Wasm | lily-multiapp-demo db | P1 |
| A20 | Rust (axum, actix) auf Wasm; Rust, das auf Wasm scheitert, fällt auf Node zurück | 200 | timberbell, summitrunner | P0 |
| A21 | C++ mit CMake, statisch, mit `libpq` (`find_package(PostgreSQL)`) | statisch gelinkt, 200 | Jan L2 statisch | P0 |
| A22 | C++ mit CMake, Shared-Fallback (eine Bibliothek ohne `.a`) | startet mit gebündelten `.so`, kein „failed to map segment“ | Jan L2 shared | P0 |
| A23 | C++ cpp-httplib, statisch, mit `getaddrinfo` (Linker-Warnung NSS) | startet, Bind und Antwort 200 | c107 | P0 |
| A24 | C++-Layout `backend/CMakeLists.txt` + `backend/src/main.cpp` | Root ist `backend` | Jan L7 | P1 |
| A25 | C ohne Build-System, Makefile-Projekt | baut und läuft | Abnahme c-Apps | P1 |
| A26 | Prisma mit SQLite (relativer Pfad) und mit Postgres | Schema-Engine startet (OpenSSL 3 erkannt, kein Download ins Paket) | slug117 | P0 |
| A27 | Puppeteer bzw. Headless-Chrome-App | entweder läuft sie, oder es kommt eine klare Meldung | slug117 (Teil) | P2 |
| A28 | Node-App über 128 MiB (vollständig 500+ MiB, getrimmt passt) | läuft oder klare Meldung, nie ein stiller Fehlstart | NODEBIG, mesacliff | P0 |
| A29 | Node-App, die getrimmt eine Startvoraussetzung verliert | Build scheitert mit „START INCOMPLETE“, nicht erst beim Start | NODETRACE | P0 |
| A30 | Python, Go, Java | klare Ablehnung „nicht unterstützt“ | 05.11. | P1 |

## B. Mehrere Apps je Projekt, Netz, Kanten

| # | Fall | Erwartet | Herkunft | P |
|---|---|---|---|---|
| B1 | Frontend Wasm → Backend Wasm über Kante | `/api` 200 | Grundfall | P0 |
| B2 | Frontend Wasm → Backend Node (gleiche Cap) über Kante | `/api` 200 (mit Schalter), sonst ehrliche Meldung „not carried“ | Jan tally | P0 |
| B3 | Frontend Node → Backend Node auf derselben Cap | 200 | Jan nach Umstellung | P0 |
| B4 | Node-Peers landen auf verschiedenen Caps | Platzierung zieht nach oder scheitert sichtbar | m126c, Jan | P0 |
| B5 | Node → Wasm | 200 | caec2625 | P1 |
| B6 | Fremdes Projekt ruft ein Backend unter demselben Namen | abgewiesen | MIXEDGE | P0 |
| B7 | Name aus `lily.toml` (`name = "api"`) als Peer-Name `http://api:8080` | löst auf oder ein klarer Hinweis steht im Build-Log | Jan L5 | P1 |
| B8 | Fetch auf öffentliche `*.lilylabs.app` bzw. das Internet aus einer App mit und ohne Egress | Vertrag erfüllt; Ablehnung kommt als Exception im Handler, nie als Hängen | Jan L1 | P0 |
| B9 | Handler gibt eigenes 502 bzw. 504 JSON zurück | Nutzer sieht den eigenen Inhalt (Cloudflare-Thema) | Jan L1 | P1 |
| B10 | Monorepo mit 4 bis 6 Apps gemischter Sprachen | alle live, alle Kanten getragen oder gemeldet | commerce-03, polyglot | P0 |
| B11 | Öffentliche und private App (`exposed:false`) | privat ist von außen 404, intern erreichbar | slug41 | P1 |
| B12 | App mit Datenbank (dbd, Postgres, `DATABASE_URL`, `PG*`) | verbindet per TLS, Daten bleiben über Redeploy | 2 DB-Apps | P0 |

## C. Konfiguration, Variablen, Secrets

| # | Fall | Erwartet | Herkunft | P |
|---|---|---|---|---|
| C1 | Secret im Platform-UI ändern, während die App läuft | geht; App startet mit neuem Wert neu; UI sagt es | Milan | P0 |
| C2 | Env per `lly env set` bei laufender App | wie C1 | Owner | P0 |
| C3 | `NEXT_PUBLIC_*` ändern bei laufender App | UI bzw. CLI bietet Rebuild an, neuer Wert danach im Client | C1 und A7 | P0 |
| C4 | Re-Scan bzw. Rebuild überschreibt keinen gesetzten Nutzerwert, kein leerer Default über einem gesetzten Wert | Nutzerwert bleibt | Jan L3 | P0 |
| C5 | Reservierte Namen (`NODE_ENV`, `PORT`) | dokumentiertes Verhalten, sichtbare Warnung, `NODE_ENV=production` gesetzt | Milan | P0 |
| C6 | Abgeleitete Geschwister-Adresse (`API_URL` auf `app-<id>`) vs. Nutzerwert | Nutzerwert gewinnt | JANREPORT | P1 |
| C7 | Secret-Werte erscheinen nie in Build- bzw. App-Logs | maskiert | 335b11bb | P0 |

## D. Deploy-Lebenszyklus

| # | Fall | Erwartet | Herkunft | P |
|---|---|---|---|---|
| D1 | Erst-Deploy aus GitHub mit Branch, mit `HEAD` (Repo ohne auflösbares HEAD), mit Tag und Commit | geht bzw. klare Meldung bei `HEAD` | Robin cacher 404 | P0 |
| D2 | Redeploy mit neuer Ref | aktualisiert bestehende Apps, keine neuen | Jan L6 | P0 |
| D3 | `lly deploy` ohne `--ref` bei pausiertem altem Flow | setzt nicht stumm mit altem Scan fort | Jan L6 | P1 |
| D4 | „done“ erst, wenn die Route steht | erster Abruf nach „done“ ist 200 | c107 | P0 |
| D5 | Redeploy und Restart einer Node-App ohne Lücke (Nachfolger ein) | durchgehend 200 | Nachfolger | P0 |
| D6 | wie D5 mit Schalter aus | höchstens kurz 503, nie 404 | 8855cd12 | P0 |
| D7 | App mit Volume, SQLite oder `/app-data` | kein Nachfolger, Stop-dann-Start, Daten bleiben | Nachfolger-Bedingung | P0 |
| D8 | Neue Version stürzt beim Start ab | alte Version bedient weiter, Meldung sichtbar | Nachfolger Fall 5 | P0 |
| D9 | Wechsel Wasm → Node auf derselben Cap | kein `command_conflict`, keine 60-min-Queue, kein 404 | demo-1611, 40b24ac5 | P0 |
| D10 | Wechsel auf andere Cap | alte Kopie wird nach Drain entfernt, nicht vorher; Bestand stimmig | 08c88e21, b4cf3c3d | P0 |
| D11 | Netzregel-Aufräumung vs. Edge-Drain | alte Kopie bleibt bis `switched_at + SOURCE_DRAIN` | 32b81b14 | P1 |
| D12 | Projekt bzw. App löschen | alle Deployments auf allen Caps weg, Slug frei, Lösch-Protokoll mit Auftraggeber | orchidwatch-Rest, APPGONE | P0 |
| D13 | Löschen einer App, deren Kopie auf einer langsamen Cap liegt | Löschen schließt ab, hängt nicht halb | test7 slug83 | P1 |
| D14 | Abgelaufene GitHub-Verbindung des Nutzers beim Redeploy | klare Meldung „GitHub neu verbinden“ | Robin 401 | P1 |
| D15 | Plan-Limits (Projekte, Apps, Repos je Projekt) mit `PAYMENTD_ENFORCE` an und aus | an: klare Ablehnung; aus: nur Log | „would refuse“ | P1 |
| D16 | Betreiber-Redeploy einer Nutzer-App aus öffentlichem Repo ohne Nutzer-Token | geht, Quell-URL unverändert | Robin, Jan | P1 |
| D17 | Zwei Quellen bzw. Generationen in einem Projekt | CLI fragt nach, keine Doppel-Apps | Jan orchidwatch/cloudflame | P1 |

## E. Edge, Adressen, Routing

| # | Fall | Erwartet | Herkunft | P |
|---|---|---|---|---|
| E1 | Slug alt (`--dev`) und neu (Wortname) | beide erreichbar | Tausch | P0 |
| E2 | Slug bleibt über Raptor-Neustart, Föderation und Store-Lücke | kein Verlust | SLUGCLAIM, STOREGAP | P0 |
| E3 | `void.lilylabs.io` von allen drei Raptoren, während einer getauscht wird | nie dauerhaft 502 | Tausch | P0 |
| E4 | Gangway-Signatur v2 auf BM-Caps | keine 401 | GANGWAYV2 | P1 |
| E5 | Custom Domain | Zertifikat und Routing | SaaS-Fallback | P2 |

## F. Caps, Carrier, Kapazität

| # | Fall | Erwartet | Herkunft | P |
|---|---|---|---|---|
| F1 | Cap mit langer Historie (300+ Installationen), Deploy-Welle | runtime-data unter 1 s, Cap bleibt erreichbar, `controller_step` p90 unter 2 s | Cap E/F | P0 |
| F2 | Raptor meldet Cap erst nach drei Fehlschlägen unerreichbar | kein Flattern | SLOWREAD | P0 |
| F3 | Volles Artefaktlager | GC räumt, kein 429 bzw. „Cap not ready“ | slug121, ARTCLEAR | P0 |
| F4 | Cap voll an Node-Zellen bzw. Speicher | sichtbare Ablehnung bzw. Umplatzierung | 11/12 Zellen | P0 |
| F5 | Carrier-Update einer Cap (GCP und BM) | Apps zurück, Host-Regeln sofort, kein Fehlstart wegen Marke | Rollout 16./17.11. | P0 |
| F6 | Cap-Neustart mit Node-Zellen | alle Node-Apps wieder live | summitmoor 503 | P0 |
| F7 | Dial-Socket bzw. Overlay-Konfiguration | Cap bootet | MIXEDGE-HALT | P0 |
| F8 | Leerlauf-CPU und Speicher je App gemessen | Werte plausibel | IDLE2 | P2 |

## G. Abrechnung und Messung

| # | Fall | Erwartet | Herkunft | P |
|---|---|---|---|---|
| G1 | Requests und Egress je App gemessen und gebucht | stimmt mit Last überein, keine Doppelbuchung | TRAFFIC2, e71e98ae | P0 |
| G2 | paymentd kurz weg | Meldungen werden nachgeholt, nichts geht verloren | 13:34 Ausfall | P0 |
| G3 | Pause bzw. Resume | ab Pause 0 gebucht | PAUSEBILL | P1 |
| G4 | Raptor-Neustart | Requests einmal gebucht | TRAFFIC2 | P1 |
| G5 | `on_hold` bzw. `credits_exhausted` mit Enforce an | App pausiert, nicht gelöscht; UI sagt warum | APPGONE | P1 |

## H. CLI

| # | Fall | Erwartet | Herkunft | P |
|---|---|---|---|---|
| H1 | Fortschrittsanzeige, wenn sich die App-Zahl ändert | kein Absturz (`ui.rs:145`) | Jan L8 | P1 |
| H2 | `lly apps -p` | zeigt alle Apps | Jan L8 | P1 |
| H3 | `lly app` nach `redeploy --ref` | zeigt neue Commit-Angabe | Jan L8 | P2 |
| H4 | `redeploy --detach` | gibt Rückmeldung | Jan L8 | P2 |
| H5 | Profile `prod` und `dev`, Login gegen `void.lilylabs.io` | geht | CLEANENV | P1 |

## I. Platform-UI und Status

| # | Fall | Erwartet | Herkunft | P |
|---|---|---|---|---|
| I1 | Secrets und Env im UI (siehe C1 bis C3) | – | Milan | P0 |
| I2 | Deploy-Fehler im UI sichtbar, mit Grund | kein „failed“ ohne Text | Robin | P0 |
| I3 | Statusmonitor: ausgefallene App rot, gelöschte grau, nie gelaufene gelb, einzelne Aussetzer nicht rot | – | STATUSAPPS | P1 |
| I4 | Admin unter Prod-Namen, Login, Alarme der lebenden Flotte kommen an | – | ADMINMOVE | P1 |

## J. Sicherheit und Isolation

| # | Fall | Erwartet | Herkunft | P |
|---|---|---|---|---|
| J1 | Projekt A erreicht nichts von Projekt B (Wasm und Node) | abgewiesen | MIXEDGE | P0 |
| J2 | Kein öffentliches DNS auf private Adressen | Prüfung über alle Zonen | SECREVIEW | P1 |
| J3 | Auth-Cookie für `.lilylabs.io` und `safeNext` nur auf eigene Hosts | kein Token-Abfluss über fremde Subdomain | SECREVIEW H2 | P1 |
| J4 | Admin und Wiki nur über VPN | von außen zu | SECREVIEW | P1 |

## K. Betriebswerkzeuge (Rollout und Überwachung)

| # | Fall | Erwartet | Herkunft | P |
|---|---|---|---|---|
| K1 | Raptor-Tausch mit hängendem `in_flight` | sauberer Abbruch bzw. Lösung | 14.11. Geist | P1 |
| K2 | Canary bzw. Abnahme werten `503 app_stopped` kurz nach „done“ als „kommt noch“ | – | canary17 | P1 |
| K3 | Canary-Werkzeug mit Prod-Profil | – | canary16 rot | P1 |
| K4 | Rollout-Gates: Staging je Cap frisch, Sicherungs-Volume vorher geprüft, jeder STOP gemeldet | – | Nacht 16./17.11. | P0 |
| K5 | Überwachung meldet jede neue ausgefallene App, nicht nur den ersten Wechsel | – | prodwatch 14:01 | P1 |
| K6 | Aufräumen: Altersprüfung, die bei Fehler abbricht statt löscht | – | bfs-Vorfall | P0 |
