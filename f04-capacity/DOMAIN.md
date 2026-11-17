> Fachliche Dokumentation der übernommenen Stammanwendung. Die aktuellen Startbefehle und Ports dieses Compiler-Falls stehen in README.md und sample.json. Frühere Screenshot-/Prüfverweise beziehen sich auf die Stammanwendung; aktuelle Nachweise stehen zentral in ../VERIFICATION.md.

# Campus

Lernplattform mit Kursgestaltung, Lernprofilen, Gruppen, sequenziellen Lernpfaden, Prüfungsfragen, Lernnotizen, Fortschrittsauswertung und lokal erzeugten Abschlussnachweisen.

## Lernen und Gestalten

**Als Kursautor:in**

1. Unter **Kurse gestalten** einen Kursentwurf mit Thema, Beschreibung, Autor und Bestehensgrenze anlegen.
2. Lektionen mit Textinhalt und Lernzeit ergänzen.
3. Pro Lektion 1–10 Prüfungsfragen erstellen. Jede Frage hat 2–5 verschiedene Antwortmöglichkeiten, genau eine richtige Antwort und eine Erklärung.
4. Lektionen in die gewünschte Reihenfolge bringen.
5. Den Kurs veröffentlichen. Danach sind Inhalt und Bestehensgrenze dieser Fassung unveränderlich.
6. Für Änderungen **Neue Version kopieren** nutzen: Inhalte werden kopiert, Einschreibungen und Fortschritt bleiben bei der bisherigen Fassung.

**Als lernende Person**

1. In der **Kursbibliothek** ein Lernprofil auswählen und in einen Kurs einschreiben.
2. Im **Lernpfad** die erste verfügbare Lektion öffnen.
3. Inhalte lesen und eine persönliche Lernnotiz speichern.
4. Den Lerncheck beantworten. Die Bewertung erfolgt auf dem Server; Feedback erklärt die passende Antwort.
5. Bei Bedarf wiederholen. Erst nach einem bestandenen Versuch wird die nächste Lektion freigeschaltet.
6. Nach allen bestandenen Lektionen den **Abschlussnachweis** öffnen und drucken.

## Gruppen und Auswertung

Lernprofile gehören jeweils zu einer Gruppe. Gruppen können gemeinsam eingeschrieben werden; bereits vorhandene Einschreibungen werden übersprungen. Die Fortschrittsansicht zeigt Person, Kurs, bestandene Lektionen, Zieltermin und Zahl der Versuche. Zieltermine lassen sich ändern. CSV exportiert diese Auswertung einschließlich Abschlusscode.

## Fachliche Regeln

- Veröffentlichte Kurse bleiben unveränderlich. Kurskopien erhalten neue Lektionen-IDs und starten ohne Lernfortschritt.
- Archivierte Kurse nehmen keine neuen Einschreibungen an. Bereits eingeschriebene Personen können weiterlernen.
- Voraussetzungen werden serverseitig geprüft, auch für Lernnotizen und direkt gesendete API-Anfragen.
- Pro Frage gilt eine richtige Antwort. Der Punktwert ist der auf ganze Prozent gerundete Anteil richtiger Antworten. Die Kursgrenze liegt zwischen 50 und 100 Prozent.
- Ein bestandener Versuch erfüllt eine Lektion dauerhaft. Ein späterer Fehlversuch setzt diesen Fortschritt nicht zurück.
- Der Abschlusscode wird genau einmal pro Einschreibung vergeben und bleibt bei Wiederholungen unverändert.
- Lernnotizen werden pro Person, Kurs und Lektion gespeichert. Der gemeinsame Arbeitsbereich hat jedoch keine privaten Benutzerkonten.
- Autor- und Lernansicht teilen denselben lokalen Datenbestand, einschließlich Antwortschlüssel. Die App ist keine beaufsichtigte Prüfungsplattform und bietet keinen Schutz vor dem Einsehen der richtigen Antworten.
- Ein Abschlussnachweis ist lokal erzeugt, keine externe oder akkreditierte Zertifizierung.

Enthalten sind zwei veröffentlichte Kurse mit mehreren Lektionen, ein Kursentwurf, zwei Lerngruppen, vier Lernprofile und nachvollziehbarer Beispielfortschritt. Inhalte werden als Klartext behandelt, nicht als ausführbares HTML.

## Start und Daten

Node.js ≥ 22.13 wird benötigt. Die Anwendung verwendet ausschließlich eingebaute Node-Module und hat keine npm-Laufzeitabhängigkeiten.

~~~bash
cd /home/leon/dev/samples/node-campus
npm start
# http://127.0.0.1:4502
~~~

npm run dev startet mit automatischem Serverneustart bei Quellcodeänderungen. Es gibt keinen Frontend-Buildschritt. Die Beispieldaten entstehen beim ersten Start; spätere Starts erhalten alle Änderungen.

Standardmäßig liegt die Datenbank unter data/campus.sqlite. APP_DATA_DIR ändert den Datenordner, PORT den Port und HOST die Bind-Adresse. Standard ist 127.0.0.1.

~~~bash
APP_DATA_DIR=/pfad/zu/campus PORT=4502 npm start
npm test
~~~

Alle Schreibvorgänge sind SQLite-Transaktionen. Jede Anfrage enthält die geladene Revision; veraltete Änderungen werden mit HTTP 409 abgewiesen. Dialogeingaben bleiben erhalten, während die Ansicht aktuelle Daten lädt. Die Aktion wird erst nach einem erneuten Speicherversuch angewendet.

## Eigenes Volume

~~~bash
docker compose up --build -d
docker compose down
~~~

Compose veröffentlicht ausschließlich 127.0.0.1:4502. Das benannte Volume campus_data wird nach /app/data gemountet. Compose ergänzt den Projektnamen im tatsächlichen Volume-Namen. down erhält die Daten; down -v löscht sie.

Für einen sichtbaren Hostordner kann der Mount durch ./data:/app/data ersetzt werden. Dieser Ordner muss für UID 1000 beschreibbar sein.

**Container-Build und Containerstart sind nicht verifiziert:** Docker ist auf dem Erstellungsrechner nicht installiert. Der direkte Node-Start, die automatisierten Tests und die Browserabläufe wurden ausgeführt.

JSON exportiert den vollständigen Arbeitsbestand einschließlich Audit-Verlauf. CSV enthält die fachliche Auswertung. Die Exporte sind keine unterstützten Rückimportformate. Für eine wiederherstellbare Sicherung die App stoppen und den gesamten Datenordner kopieren.

## Aufbau und Prüfung

- store.mjs: eigenes Datenmodell, Geschäftsregeln, Beispieldaten und Exporte.
- db.mjs: SQLite-Zugriff, Transaktionen, Validierung und Revisionskontrolle.
- server.mjs: HTTP, lokale Dateien und JSON-Kommandos.
- web/: Oberfläche in JavaScript, HTML und CSS, ohne externe Ressourcen.
- tests/domain.test.mjs: fachliche Invarianten und Fehlerfälle.
- tests/persistence-http.test.mjs: Wiederöffnen der Datenbank, Konflikte und echte HTTP-Anfragen.
- tests/browser-check.cjs: reproduzierbarer Browserablauf.
- artifacts/: Screenshots und konkrete Prüfprotokolle.

npm test benötigt keine zusätzlichen Pakete. Die optionalen Browserchecks benötigen @playwright/test, @axe-core/playwright und Chromium in einem separaten Werkzeugordner:

~~~bash
BROWSER_TOOLS_DIR=/pfad/zu/browser-werkzeugen node tests/browser-check.cjs
~~~

BROWSER_TOOLS_DIR zeigt auf den Ordner, in dem die Testpakete installiert sind. CHROMIUM_EXECUTABLE kann eine vorhandene Chromium-Datei auswählen; sonst verwendet Playwright seinen installierten Browser. TEST_PORT überschreibt den Testport (standardmäßig Anwendungsport + 10000). Der Browsertest startet einen eigenen Server mit temporärer Datenbank und beendet ihn anschließend.

Die Prüfungen decken Desktop (1440 × 1000), Mobilansicht (390 × 844), die Hauptansichten, zentrale Dialoge und vollständige Arbeitsabläufe ab. Axe prüft automatisierbare WCAG-A/AA-Regeln; das ist kein vollständiges Barrierefreiheits-Audit.

## Betriebsrahmen

Eigenständiger lokaler Arbeitsbereich ohne Anmeldung oder Rollenprüfung. Ein Datenordner beziehungsweise Volume gehört genau dieser App. Kein gemeinsamer Laufzeitserver und keine Build- oder Laufzeitimporte aus Nachbarprojekten. Die Oberfläche lädt den gesamten Arbeitsbestand; Pagination und ein Mehrbenutzer-Berechtigungsmodell sind nicht implementiert.
