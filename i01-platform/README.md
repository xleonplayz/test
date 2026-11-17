# I1 · Secrets und Env im UI (siehe C1 bis C3)

Vollständige eigenständige Anwendung auf Basis von `node-buehne`. Fachliche Bedienung und Arbeitsabläufe: [DOMAIN.md](DOMAIN.md).

```sh
npm start
npm test
```

Standardport 5189. Speicherung: **sqlite**. Keine Abhängigkeit von Nachbarprojekten. Eigene Kopie von Oberfläche, Fachlogik, Tests und Speicheradapter.

## Prüfziel

–

Herkunft: Milan; Priorität P0. Die lokale App liefert beobachtbare Antworten; sie simuliert keine erfolgreiche Lily-Platzierung, Abrechnung oder Isolation. Der Plattformfall bleibt bis zu einem externen Lauf offen.

## Beobachtbare Schnittstellen

- `/` und `/api/state`: vollständige Fachanwendung.
- `/__fixture`: Fall, Version, Boot-Instanz, Laufzeit, Projektmarker.
- `/__fixture/status?code=502` bzw. `504`: eigener Fehlerinhalt.
- `/__fixture/peer`: Aufruf von `PEER_URL` bzw. `API_URL` mit Zeitlimit.
- `/__fixture/egress`: Aufruf des konfigurierten `EGRESS_URL`; Fehler wird als JSON beantwortet.
- `/__fixture/bytes?n=1048576`: exakt definierte Nutzlast für Messung.
- `/__fixture/metrics`: lokale HTTP-Zähler, keine behauptete Plattformabrechnung.
- `/__fixture/config`: öffentliche Konfiguration ohne Secret-Werte.
- `/__fixture/proof?nonce=abcdefgh`: HMAC-Nachweis des gesetzten `FIXTURE_SECRET`.
- `POST /__fixture/append`, Header `X-Fixture: 1`: persistente Journalzeile.
- `POST /__fixture/log-probe`, Header `X-Fixture: 1`: fest bekannter synthetischer Maskierungsmarker.

## Gegenprobe und Ablauf

Siehe [scenario.json](scenario.json). `FAIL_START=1` erzeugt einen echten Startfehler, `READY_DELAY_MS=3000` eine beobachtbare 503-Phase und `RESPONSE_DELAY_MS` eine langsame Antwort. `RELEASE=v2` kennzeichnet den Nachfolger. Eine Gegenprobe am App-Verhalten ersetzt nicht den Lauf gegen eine Compiler-/Plattformversion ohne den jeweiligen Fix.


## Compiler-Fall und Varianten

Secrets und Env im UI (siehe C1 bis C3)

Erwartung auf der Lily-Plattform: –

[Prüfablauf und Gegenprobe](scenario.json). Lokale Builds sind keine Bestätigung des Wasm-/Lily-Pfads.

- [.](./): node · Vollständige Fachanwendung; Details in DOMAIN.md bzw. der bisherigen README

- [public-client](public-client/): next · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON
