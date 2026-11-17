> Fachliche Dokumentation der übernommenen Stammanwendung. Die aktuellen Startbefehle und Ports dieses Compiler-Falls stehen in README.md und sample.json. Frühere Screenshot-/Prüfverweise beziehen sich auf die Stammanwendung; aktuelle Nachweise stehen zentral in ../VERIFICATION.md.

# Werkstatt

Reparaturmanagement für eine kleine Gerätewerkstatt. Annahme, Diagnose, Kostenvoranschläge, Kundenfreigabe, Teilebestand, Arbeitszeit, Abschlussprüfung und Abholung sind miteinander verbunden.

## Vom Eingang bis zur Abholung

1. **Kunde** und **Teammitglied** anlegen.
2. Eine **Reparatur annehmen**: Gerät, Seriennummer, Fehlerbild, Priorität und Zieltermin erfassen.
3. Eine Person zuweisen und die **Diagnose** dokumentieren.
4. Einen **Kostenvoranschlag** erstellen: Ersatzteilpositionen, Arbeitsminuten, Stundensatz und Leistungsbeschreibung.
5. Die Kundenentscheidung lokal protokollieren. Bei **Freigabe** werden alle benötigten Ersatzteile zusammen reserviert.
6. **Reparatur starten**: Die reservierten Teile werden genau einmal aus dem Bestand ausgebucht.
7. Tatsächliche **Arbeitszeit** und ausgeführte Arbeiten protokollieren.
8. In die **Abschlussprüfung** wechseln und Funktion, Sichtprüfung sowie Fehlerbild prüfen.
9. Nach drei bestandenen Prüfungen **abholbereit** melden.
10. Die **Abholung** mit dem Namen der abholenden Person erfassen.

## Angebote, Teile und Nacharbeit

- Ein neues Angebot ersetzt eine noch offene Fassung. Frühere Fassungen bleiben sichtbar.
- Teilepreise und kalkulierte Arbeitskosten werden im Angebot festgehalten. Spätere Stammdatenänderungen verändern alte Angebote nicht.
- Der Gesamtbetrag ergibt sich aus Teilemengen × gespeicherten Teilepreisen plus Arbeitsminuten × Stundensatz / 60, auf ganze Cent gerundet.
- Eine Freigabe scheitert vollständig, wenn auch nur ein Ersatzteil nicht verfügbar ist. Es entstehen keine Teilreservierungen.
- Bestandskorrekturen dürfen reservierte Mengen nicht aufbrauchen.
- Vor Arbeitsbeginn kann ein Auftrag mit Begründung storniert werden. Reservierungen werden dabei freigegeben.
- Nach Arbeitsbeginn ist keine einfache Stornierung vorgesehen; verbrauchte Teile werden nicht automatisch zurückgebucht.
- Arbeitsbeginn benötigt eine zuständige Person. Die Abschlussprüfung benötigt mindestens einen Arbeitszeiteintrag.
- **Nacharbeit** setzt alle Prüfmarkierungen zurück, damit anschließend erneut geprüft wird. Die Teile werden dabei nicht noch einmal ausgebucht.
- Abgeholte Aufträge nehmen keine weiteren Arbeitszeiteinträge an.

Das **Werkstattboard** zeigt sieben Bearbeitungsstationen. Aufträge lassen sich nach Gerät, Seriennummer, Fehlerbild und Kunde suchen. Kunden- und Teamseiten führen direkt zu ihren Aufträgen. Das Teilelager zeigt Bestand, reservierte und verfügbare Mengen sowie ein Bewegungsjournal. Die Auswertung vergleicht kalkulierte und tatsächliche Arbeitszeit.

Kostenvoranschläge, Kundenfreigaben und Abholungen werden ausschließlich lokal dokumentiert. Es werden keine Angebote oder Nachrichten versendet, keine Rechnungen erstellt und keine Zahlungen verarbeitet. Steuer-, Garantie-, Retouren- und Buchhaltungsprozesse sind nicht Teil des Modells.

Die drei Beispielaufträge stehen in verschiedenen Phasen; einer besitzt ein offenes Angebot, ein anderer ist bereits in Reparatur. Vier Ersatzteile und zwei Teammitglieder sind enthalten.

## Start und Daten

Node.js ≥ 22.13 wird benötigt. Die Anwendung verwendet ausschließlich eingebaute Node-Module und hat keine npm-Laufzeitabhängigkeiten.

~~~bash
cd /home/leon/dev/samples/node-werkstatt
npm start
# http://127.0.0.1:4503
~~~

npm run dev startet mit automatischem Serverneustart bei Quellcodeänderungen. Es gibt keinen Frontend-Buildschritt. Die Beispieldaten entstehen beim ersten Start; spätere Starts erhalten alle Änderungen.

Standardmäßig liegt die Datenbank unter data/werkstatt.sqlite. APP_DATA_DIR ändert den Datenordner, PORT den Port und HOST die Bind-Adresse. Standard ist 127.0.0.1.

~~~bash
APP_DATA_DIR=/pfad/zu/werkstatt PORT=4503 npm start
npm test
~~~

Alle Schreibvorgänge sind SQLite-Transaktionen. Jede Anfrage enthält die geladene Revision; veraltete Änderungen werden mit HTTP 409 abgewiesen. Dialogeingaben bleiben erhalten, während die Ansicht aktuelle Daten lädt. Die Aktion wird erst nach einem erneuten Speicherversuch angewendet.

## Eigenes Volume

~~~bash
docker compose up --build -d
docker compose down
~~~

Compose veröffentlicht ausschließlich 127.0.0.1:4503. Das benannte Volume werkstatt_data wird nach /app/data gemountet. Compose ergänzt den Projektnamen im tatsächlichen Volume-Namen. down erhält die Daten; down -v löscht sie.

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
