# Verifikation · lokale App-Sammlung

Stand: 2026-11-17T08:54:51.614133+00:00

| Prüfung | Ergebnis | Nachweis |
| --- | --- | --- |
| Vorhandene Apps: Build und Tests | 24/24 bestanden | [artifacts/checks-20261117T075348.688254Z/results.json](../artifacts/checks-20261117T075348.688254Z/results.json) |
| Neue Apps: Build und Fachtests | 142/142 bestanden | [artifacts/corpus-20261117T084226.937389Z/results.json](../artifacts/corpus-20261117T084226.937389Z/results.json) |
| Neue Apps: gestartete HTTP-Server | 142/142 bestanden | [artifacts/http-20261117T084531.092280Z/results.json](../artifacts/http-20261117T084531.092280Z/results.json) und [artifacts/postgres-http/results.json](../artifacts/postgres-http/results.json) |
| Browser: vollständige ausgewählte Abläufe | 33/33 bestanden | [artifacts/browser-corpus/results.json](../artifacts/browser-corpus/results.json) |

## Konkrete zusätzliche Nachweise

- [artifacts/behavior-corpus/results.json](../artifacts/behavior-corpus/results.json): C1/C2/C7; PUBLIC-ORIGIN; D7; D8; D4/K2; B8/B9; B10; A29; A21/A22/A23.
- [artifacts/special-corpus/results.json](../artifacts/special-corpus/results.json): A27; A22; A7; C3.
- [artifacts/protocol-corpus/results.json](../artifacts/protocol-corpus/results.json): A14; A26.
- [artifacts/launcher-corpus/results.json](../artifacts/launcher-corpus/results.json): B10.

Geprüft sind unter anderem echte Schreibzugriffe und Versionskonflikte, Auftragsabläufe im Browser, mobile Ansichten, Hash-Historie und Direktanker, Bun-Assets auf tiefen Routen samt Tailwind, WebSocket-Echo, PostgreSQL-TLS und Persistenz nach Neustart, relative Prisma-SQLite-Dateien, native PDF-Erzeugung, statische ELF-Dateien und eine verschobene Installation mit gebündelter Shared Library.

Die HTTP-Prüfung betreibt die Apps auf separaten lokalen Ports und mit isolierten Testdaten. Next-/Nuxt-Anwendungen laufen dabei mit ihren normalen Upstream-Servern. Dies ist ausdrücklich kein Nachweis einer Wasm-Kompilierung.

Die Browserprüfung enthält 33 ausgewählte Varianten und vollständige Arbeitsabläufe; sie ist keine Prüfung jeder Ansicht aller 142 Apps. Screenshots liegen je geprüfter Variante unter `../artifacts/browser-corpus/`.

## Noch nicht ausgeführt

Alle 103 Plattformfälle bleiben `not_run`: tatsächliche Lily-/Wasm-Kompilierung, reale Raptor-/Cap- und Edge-Transitions, Abrechnung, Plattform-UI/CLI und Gegenproben auf alten fehlerhaften Plattformversionen. Docker-/Compose-Builds wurden ebenfalls nicht ausgeführt. Die Apps und fallbezogenen Szenarien stehen dafür bereit.

Absichtliche Ablehnungsfälle werden nicht als erfolgreiche Lily-Deployments gezählt. Frühere fehlgeschlagene lokale Läufe bleiben als Diagnosehistorie in artifacts erhalten; die oben verlinkten Abschlussläufe und verification.json nennen die finalen Ergebnisse.

## Toolchains

- node: `v22.22.1`
- npm: `11.17.0`
- rust: `rustc 1.97.1 (8bab26f4f 2026-07-14)`
- cargo: `cargo 1.97.1 (c980f4866 2026-06-30)`
- cmake: `cmake version 3.28.3`
- cxx: `g++ (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0`
- go: `go version go1.22.2 linux/amd64`
- java: `javac 21.0.13.0.3`
- python: `Python 3.12.3`
