# Abdeckungsmatrix · 103 Fälle

Lokale Builds/Funktionen und tatsächliche Lily-Plattformprüfung sind getrennte Nachweise. Der Plattformstatus ist bei allen Fällen `not_run`; Details stehen in der jeweiligen scenario.json.

| Fall | Apps | Stacks | Use Case | Erwartung auf Lily |
| --- | ---: | --- | --- | --- |
| [A1](a01-next-app-router/) | 1 | next | Next.js App Router, statisch und dynamisch, auf Wasm | `/`, dynamische Route, API-Route 200 |
| [A2](a02-next-pages-router/) | 1 | next | Next.js Pages Router | geht auf Node, läuft, `/api/*` 200 |
| [A3](a03-next-proxy-login/) | 1 | next | Next.js mit Middleware bzw. Proxy, Redirect auf `/login` | 307 auf `/login`, Login-Seite 200 |
| [A4](a04-next-static-image/) | 1 | next | Next.js mit statischem Bild-Import aus `public/` (`import x from "@/public/a.png"`, auch `next/image` mit statischem Import) | Wasm-Build ok, Seite rendert |
| [A5](a05-next-async-finally/) | 1 | next | Next.js mit `try { await } catch { await } finally {}` (z. B. `@supabase/auth-js`) | Wasm-Build ok |
| [A6](a06-next-runtime-files/) | 1 | next | Next.js mit `fs/promises`-Lesezugriff zur Laufzeit (JSON-Dateien) | geht auf Node, liefert Daten (kein 500) |
| [A7](a07-next-public-env/) | 1 | next | Next.js mit `NEXT_PUBLIC_*` als normale Variable und als Secret | Wert beim Build eingebettet, im Log maskiert, Warnhinweis bei Secret |
| [A8](a08-next-hash-navigation/) | 1 | next | Next.js Hash-Navigation: Klick `#anker`, Zurück/Vor zwischen Ankern, Direktaufruf `/#faq`, Soft-Navigation `/seite#abschnitt` | kein Neuladen, scrollt zum Ziel, Client-Zustand bleibt |
| [A9](a09-next-turbopack/) | 2 | next | Next.js 16 mit Turbopack-Ausgabe | baut und läuft |
| [A10](a10-nuxt-nitro/) | 2 | nuxt | Nuxt 3/4 (Nitro-Ausgabe, ESM-only `node_modules` in `.output/server`) | Startprüfung findet die Pakete, läuft |
| [A11](a11-vite-astro-static/) | 2 | astro, vite | Vite-SPA statisch, Astro statisch | wird statisch ausgeliefert |
| [A12](a12-bun-routes/) | 1 | bun | Bun-Server mit `Bun.serve` (`fetch`, `routes`, `:params`, Wildcards, HTML-Import, Tailwind über `bun-plugin-tailwind`) | läuft auf Node, `/`, Unterpfad, API GET/PUT/Param 200, CSS und JS laden |
| [A13](a13-bun-deep-assets/) | 1 | bun | Bun-Server: Assets auf Unterpfaden (`/a/b/c` lädt `chunk-*.css`) | Assets 200 (absolute URLs) |
| [A14](a14-bun-unsupported/) | 4 | bun | Bun mit nicht abgedeckter API (`bun:sqlite`, `Bun.spawn`, `$` aus `bun`, WebSocket) | Build scheitert mit klarer Meldung, die die API nennt |
| [A15](a15-bun-lockfiles/) | 2 | bun | Bun-Projekt mit `bun.lock` (Install über bun) und mit `package-lock.json` | beide Wege bauen gleich |
| [A16](a16-tsx-server/) | 1 | node | TypeScript-Server über `tsx` (Start-Skript `NODE_ENV=production tsx src/index.ts`) | `tsx` samt esbuild im Paket, Start ok |
| [A17](a17-node-frameworks/) | 5 | express, fastify, hono, koa, node | Express, Koa, Hono, Fastify, Node-HTTP (`node server.js`) | 200 |
| [A18](a18-node-missing-start/) | 1 | node | Node-App ohne Startbefehl (kein `scripts.start`, kein `main`) | Build scheitert mit klarer Meldung |
| [A19](a19-node-file-journal/) | 1 | node | Node-App mit `appendFileSync` bzw. Dateischreiben | geht auf Node, nicht auf Wasm |
| [A20](a20-rust-servers/) | 5 | rust | Rust (axum, actix) auf Wasm; Rust, das auf Wasm scheitert, fällt auf Node zurück | 200 |
| [A21](a21-cpp-postgres-static/) | 1 | cpp | C++ mit CMake, statisch, mit `libpq` (`find_package(PostgreSQL)`) | statisch gelinkt, 200 |
| [A22](a22-cpp-shared-library/) | 1 | cpp | C++ mit CMake, Shared-Fallback (eine Bibliothek ohne `.a`) | startet mit gebündelten `.so`, kein „failed to map segment“ |
| [A23](a23-cpp-httplib-dns/) | 1 | cpp | C++ cpp-httplib, statisch, mit `getaddrinfo` (Linker-Warnung NSS) | startet, Bind und Antwort 200 |
| [A24](a24-cpp-backend-layout/) | 1 | cpp | C++-Layout `backend/CMakeLists.txt` + `backend/src/main.cpp` | Root ist `backend` |
| [A25](a25-c-build-layouts/) | 2 | c | C ohne Build-System, Makefile-Projekt | baut und läuft |
| [A26](a26-prisma-databases/) | 2 | prisma | Prisma mit SQLite (relativer Pfad) und mit Postgres | Schema-Engine startet (OpenSSL 3 erkannt, kein Download ins Paket) |
| [A27](a27-puppeteer-reports/) | 1 | node | Puppeteer bzw. Headless-Chrome-App | entweder läuft sie, oder es kommt eine klare Meldung |
| [A28](a28-node-large-package/) | 1 | node | Node-App über 128 MiB (vollständig 500+ MiB, getrimmt passt) | läuft oder klare Meldung, nie ein stiller Fehlstart |
| [A29](a29-node-start-incomplete/) | 1 | node | Node-App, die getrimmt eine Startvoraussetzung verliert | Build scheitert mit „START INCOMPLETE“, nicht erst beim Start |
| [A30](a30-unsupported-languages/) | 3 | go, java, python | Python, Go, Java | klare Ablehnung „nicht unterstützt“ |
| [B1](b01-network/) | 2 | next | Frontend Wasm → Backend Wasm über Kante | `/api` 200 |
| [B2](b02-network/) | 2 | next, node | Frontend Wasm → Backend Node (gleiche Cap) über Kante | `/api` 200 (mit Schalter), sonst ehrliche Meldung „not carried“ |
| [B3](b03-network/) | 2 | node | Frontend Node → Backend Node auf derselben Cap | 200 |
| [B4](b04-network/) | 2 | node | Node-Peers landen auf verschiedenen Caps | Platzierung zieht nach oder scheitert sichtbar |
| [B5](b05-network/) | 2 | next, node | Node → Wasm | 200 |
| [B6](b06-network/) | 3 | node | Fremdes Projekt ruft ein Backend unter demselben Namen | abgewiesen |
| [B7](b07-network/) | 2 | node | Name aus `lily.toml` (`name = "api"`) als Peer-Name `http://api:8080` | löst auf oder ein klarer Hinweis steht im Build-Log |
| [B8](b08-network/) | 1 | node | Fetch auf öffentliche `*.lilylabs.app` bzw. das Internet aus einer App mit und ohne Egress | Vertrag erfüllt; Ablehnung kommt als Exception im Handler, nie als Hängen |
| [B9](b09-network/) | 1 | node | Handler gibt eigenes 502 bzw. 504 JSON zurück | Nutzer sieht den eigenen Inhalt (Cloudflare-Thema) |
| [B10](b10-network/) | 6 | cpp, next, node, rust | Monorepo mit 4 bis 6 Apps gemischter Sprachen | alle live, alle Kanten getragen oder gemeldet |
| [B11](b11-network/) | 2 | node | Öffentliche und private App (`exposed:false`) | privat ist von außen 404, intern erreichbar |
| [B12](b12-network/) | 2 | pg, prisma | App mit Datenbank (dbd, Postgres, `DATABASE_URL`, `PG*`) | verbindet per TLS, Daten bleiben über Redeploy |
| [C1](c01-configuration/) | 1 | node | Secret im Platform-UI ändern, während die App läuft | geht; App startet mit neuem Wert neu; UI sagt es |
| [C2](c02-configuration/) | 1 | node | Env per `lly env set` bei laufender App | wie C1 |
| [C3](c03-configuration/) | 2 | next, node | `NEXT_PUBLIC_*` ändern bei laufender App | UI bzw. CLI bietet Rebuild an, neuer Wert danach im Client |
| [C4](c04-configuration/) | 1 | node | Re-Scan bzw. Rebuild überschreibt keinen gesetzten Nutzerwert, kein leerer Default über einem gesetzten Wert | Nutzerwert bleibt |
| [C5](c05-configuration/) | 1 | node | Reservierte Namen (`NODE_ENV`, `PORT`) | dokumentiertes Verhalten, sichtbare Warnung, `NODE_ENV=production` gesetzt |
| [C6](c06-configuration/) | 1 | node | Abgeleitete Geschwister-Adresse (`API_URL` auf `app-<id>`) vs. Nutzerwert | Nutzerwert gewinnt |
| [C7](c07-configuration/) | 1 | node | Secret-Werte erscheinen nie in Build- bzw. App-Logs | maskiert |
| [D1](d01-lifecycle/) | 1 | node | Erst-Deploy aus GitHub mit Branch, mit `HEAD` (Repo ohne auflösbares HEAD), mit Tag und Commit | geht bzw. klare Meldung bei `HEAD` |
| [D2](d02-lifecycle/) | 1 | node | Redeploy mit neuer Ref | aktualisiert bestehende Apps, keine neuen |
| [D3](d03-lifecycle/) | 1 | node | `lly deploy` ohne `--ref` bei pausiertem altem Flow | setzt nicht stumm mit altem Scan fort |
| [D4](d04-lifecycle/) | 1 | node | „done“ erst, wenn die Route steht | erster Abruf nach „done“ ist 200 |
| [D5](d05-lifecycle/) | 1 | node | Redeploy und Restart einer Node-App ohne Lücke (Nachfolger ein) | durchgehend 200 |
| [D6](d06-lifecycle/) | 1 | node | wie D5 mit Schalter aus | höchstens kurz 503, nie 404 |
| [D7](d07-lifecycle/) | 1 | node | App mit Volume, SQLite oder `/app-data` | kein Nachfolger, Stop-dann-Start, Daten bleiben |
| [D8](d08-lifecycle/) | 1 | node | Neue Version stürzt beim Start ab | alte Version bedient weiter, Meldung sichtbar |
| [D9](d09-lifecycle/) | 1 | node | Wechsel Wasm → Node auf derselben Cap | kein `command_conflict`, keine 60-min-Queue, kein 404 |
| [D10](d10-lifecycle/) | 1 | node | Wechsel auf andere Cap | alte Kopie wird nach Drain entfernt, nicht vorher; Bestand stimmig |
| [D11](d11-lifecycle/) | 1 | node | Netzregel-Aufräumung vs. Edge-Drain | alte Kopie bleibt bis `switched_at + SOURCE_DRAIN` |
| [D12](d12-lifecycle/) | 1 | node | Projekt bzw. App löschen | alle Deployments auf allen Caps weg, Slug frei, Lösch-Protokoll mit Auftraggeber |
| [D13](d13-lifecycle/) | 1 | node | Löschen einer App, deren Kopie auf einer langsamen Cap liegt | Löschen schließt ab, hängt nicht halb |
| [D14](d14-lifecycle/) | 1 | node | Abgelaufene GitHub-Verbindung des Nutzers beim Redeploy | klare Meldung „GitHub neu verbinden“ |
| [D15](d15-lifecycle/) | 1 | node | Plan-Limits (Projekte, Apps, Repos je Projekt) mit `PAYMENTD_ENFORCE` an und aus | an: klare Ablehnung; aus: nur Log |
| [D16](d16-lifecycle/) | 1 | node | Betreiber-Redeploy einer Nutzer-App aus öffentlichem Repo ohne Nutzer-Token | geht, Quell-URL unverändert |
| [D17](d17-lifecycle/) | 1 | node | Zwei Quellen bzw. Generationen in einem Projekt | CLI fragt nach, keine Doppel-Apps |
| [E1](e01-routing/) | 1 | node | Slug alt (`--dev`) und neu (Wortname) | beide erreichbar |
| [E2](e02-routing/) | 1 | node | Slug bleibt über Raptor-Neustart, Föderation und Store-Lücke | kein Verlust |
| [E3](e03-routing/) | 1 | node | `void.lilylabs.io` von allen drei Raptoren, während einer getauscht wird | nie dauerhaft 502 |
| [E4](e04-routing/) | 1 | node | Gangway-Signatur v2 auf BM-Caps | keine 401 |
| [E5](e05-routing/) | 1 | node | Custom Domain | Zertifikat und Routing |
| [F1](f01-capacity/) | 1 | node | Cap mit langer Historie (300+ Installationen), Deploy-Welle | runtime-data unter 1 s, Cap bleibt erreichbar, `controller_step` p90 unter 2 s |
| [F2](f02-capacity/) | 1 | node | Raptor meldet Cap erst nach drei Fehlschlägen unerreichbar | kein Flattern |
| [F3](f03-capacity/) | 1 | node | Volles Artefaktlager | GC räumt, kein 429 bzw. „Cap not ready“ |
| [F4](f04-capacity/) | 1 | node | Cap voll an Node-Zellen bzw. Speicher | sichtbare Ablehnung bzw. Umplatzierung |
| [F5](f05-capacity/) | 1 | node | Carrier-Update einer Cap (GCP und BM) | Apps zurück, Host-Regeln sofort, kein Fehlstart wegen Marke |
| [F6](f06-capacity/) | 1 | node | Cap-Neustart mit Node-Zellen | alle Node-Apps wieder live |
| [F7](f07-capacity/) | 1 | node | Dial-Socket bzw. Overlay-Konfiguration | Cap bootet |
| [F8](f08-capacity/) | 1 | node | Leerlauf-CPU und Speicher je App gemessen | Werte plausibel |
| [G1](g01-metering/) | 1 | node | Requests und Egress je App gemessen und gebucht | stimmt mit Last überein, keine Doppelbuchung |
| [G2](g02-metering/) | 1 | node | paymentd kurz weg | Meldungen werden nachgeholt, nichts geht verloren |
| [G3](g03-metering/) | 1 | node | Pause bzw. Resume | ab Pause 0 gebucht |
| [G4](g04-metering/) | 1 | node | Raptor-Neustart | Requests einmal gebucht |
| [G5](g05-metering/) | 1 | node | `on_hold` bzw. `credits_exhausted` mit Enforce an | App pausiert, nicht gelöscht; UI sagt warum |
| [H1](h01-cli/) | 1 | node | Fortschrittsanzeige, wenn sich die App-Zahl ändert | kein Absturz (`ui.rs:145`) |
| [H2](h02-cli/) | 1 | node | `lly apps -p` | zeigt alle Apps |
| [H3](h03-cli/) | 1 | node | `lly app` nach `redeploy --ref` | zeigt neue Commit-Angabe |
| [H4](h04-cli/) | 1 | node | `redeploy --detach` | gibt Rückmeldung |
| [H5](h05-cli/) | 1 | node | Profile `prod` und `dev`, Login gegen `void.lilylabs.io` | geht |
| [I1](i01-platform/) | 2 | next, node | Secrets und Env im UI (siehe C1 bis C3) | – |
| [I2](i02-platform/) | 1 | node | Deploy-Fehler im UI sichtbar, mit Grund | kein „failed“ ohne Text |
| [I3](i03-platform/) | 1 | node | Statusmonitor: ausgefallene App rot, gelöschte grau, nie gelaufene gelb, einzelne Aussetzer nicht rot | – |
| [I4](i04-platform/) | 1 | node | Admin unter Prod-Namen, Login, Alarme der lebenden Flotte kommen an | – |
| [J1](j01-isolation/) | 4 | next, node | Projekt A erreicht nichts von Projekt B (Wasm und Node) | abgewiesen |
| [J2](j02-isolation/) | 1 | node | Kein öffentliches DNS auf private Adressen | Prüfung über alle Zonen |
| [J3](j03-isolation/) | 1 | node | Auth-Cookie für `.lilylabs.io` und `safeNext` nur auf eigene Hosts | kein Token-Abfluss über fremde Subdomain |
| [J4](j04-isolation/) | 1 | node | Admin und Wiki nur über VPN | von außen zu |
| [K1](k01-operations/) | 1 | node | Raptor-Tausch mit hängendem `in_flight` | sauberer Abbruch bzw. Lösung |
| [K2](k02-operations/) | 1 | node | Canary bzw. Abnahme werten `503 app_stopped` kurz nach „done“ als „kommt noch“ | – |
| [K3](k03-operations/) | 1 | node | Canary-Werkzeug mit Prod-Profil | – |
| [K4](k04-operations/) | 1 | node | Rollout-Gates: Staging je Cap frisch, Sicherungs-Volume vorher geprüft, jeder STOP gemeldet | – |
| [K5](k05-operations/) | 1 | node | Überwachung meldet jede neue ausgefallene App, nicht nur den ersten Wechsel | – |
| [K6](k06-operations/) | 1 | node | Aufräumen: Altersprüfung, die bei Fehler abbricht statt löscht | – |
