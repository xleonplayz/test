# Fluss

Eigenständige C++20-Anwendung für Produktionsplanung. Sie simuliert Aufträge mit mehreren Arbeitsschritten, parallelen Arbeitsplätzen, Freigaben, Lieferterminen und Wartungsfenstern. Ein interaktiver HTML-Bericht vergleicht Regeln und zeigt einen Gantt-Plan, Stationsauslastung und Terminabweichungen.

## Bauen und starten

CMake ≥ 3.20 und ein C++20-Compiler, beispielsweise GCC ≥ 11. Keine externen Bibliotheken.

~~~bash
cd /home/leon/dev/samples/cpp-fluss
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j 2
ctest --test-dir build --output-on-failure
./build/fluss --input examples/workshop --out results/baseline --compare
~~~

Danach results/baseline/report.html im Browser öffnen. Die Ansicht funktioniert lokal ohne Server, Internetverbindung oder installierte Frontend-Pakete.

Eine zusätzliche Lackierstation ausprobieren:

~~~bash
./build/fluss --input examples/workshop --out results/lack-zwei --compare --capacity lack:2
~~~

Einzelregel:

~~~bash
./build/fluss --input examples/workshop --out results/edd --rule edd
~~~

Das Ausgabeverzeichnis muss neu sein. Fluss schreibt zunächst in ein temporäres Verzeichnis und übernimmt erst den vollständigen Bericht. Bestehende Ergebnisse werden nicht überschrieben.

## Regeln

- **FCFS**: Zuerst der Auftrag, dessen nächster Arbeitsschritt am längsten bereitsteht.
- **SPT**: Zuerst der kürzeste unmittelbar anstehende Arbeitsschritt.
- **EDD**: Zuerst der Auftrag mit dem frühesten Liefertermin.

Bei Gleichstand entscheiden Bereitzeit und Auftragskennung. Arbeitsschritte werden nicht unterbrochen. Ein Schritt startet nur, wenn er vollständig vor der nächsten Wartung fertig wird; ein kürzerer Auftrag kann eine freie Lücke nutzen.

## Eingabeverzeichnis

stations.csv:

~~~csv
station,capacity
zuschnitt,2
lack,1
~~~

jobs.csv:

~~~csv
job,release,due,route
AUF-101,0,90,zuschnitt:15|lack:30
AUF-102,10,110,zuschnitt:20|lack:25
~~~

Optionale maintenance.csv:

~~~csv
station,start,end
lack,45,60
~~~

Alle Zeiten sind ganze Minuten ab einem gemeinsamen Planungsbeginn (0). capacity beschreibt identische parallele Plätze einer Station. Wartung sperrt die ganze Station. Aufträge folgen der Route strikt; dieselbe Station darf mehrfach vorkommen.

Kopfzeilen müssen exakt übereinstimmen. CSV unterstützt Anführungszeichen, verdoppelte Anführungszeichen und CRLF. Stationsnamen verwenden Buchstaben, Zahlen, Unterstrich oder Bindestrich.

Grenzen: 1–32 Stationen, 1–8 Plätze pro Station, 1–1000 Aufträge mit jeweils 1–20 Schritten, höchstens 1000 Wartungsfenster, höchstens 8 MB pro CSV-Datei. Ungültige Verweise, doppelte Kennungen und ungültige Zeitwerte werden abgewiesen.

## Ausgaben

| Datei | Inhalt |
| --- | --- |
| report.html | Regelwechsel, Auftragssuche, Gantt, Auslastung und Termintabelle |
| summary.json | Alle Regeln, Kennzahlen und Stationskapazitäten |
| schedule.csv | Jeder Schritt mit Bereitzeit, Start, Ende, Wartezeit und Platz |
| jobs.csv | Fertigstellung, Durchlaufzeit, Wartezeit und Verspätung pro Auftrag |
| plan.svg | Gantt der ersten berechneten Regel, direkt exportierbar |

Die Auftragsuche filtert die Termintabelle; der Gantt zeigt weiter den vollständigen Ablauf. CSV-Downloads enthalten alle berechneten Regeln. Die Auslastung bezieht sich auf verfügbare Kapazitätsminuten zwischen Minute 0 und dem letzten Abschluss; überlappende Wartungen werden nur einmal abgezogen.

## Bereits berechnetes Beispiel

Fertige Berichte liegen in [artifacts/baseline/report.html](artifacts/baseline/report.html) und [artifacts/more-capacity/report.html](artifacts/more-capacity/report.html).

| Szenario | Gesamtdauer | SPT termintreu | SPT Ø Wartezeit |
| --- | --- | --- | --- |
| Eine Lackierstation | 353 min | 6 / 10 | 58,6 min |
| Zwei Lackierstationen | 278 min | 6 / 10 | 39,7 min |

Die zusätzliche Kapazität verkürzt hier die Gesamtdauer um 75 Minuten, verändert aber nicht die Zahl rechtzeitiger Aufträge. Das Beispiel zeigt, warum Durchsatz und Termintreue getrennt betrachtet werden müssen.

## Modellgrenzen und Tests

Die Regeln sind Heuristiken und liefern kein garantiertes Optimum. Feste Bearbeitungszeiten; keine Rüstzeiten, Materialknappheit, Mitarbeiterschichten, Transportwege, Kostenoptimierung oder ungeplanten Störungen. Aufträge und Stationsdaten bleiben in den eigenen Eingabeordnern; jede Berechnung erzeugt ein separates Ergebnisverzeichnis.

Tests prüfen CSV-Verarbeitung, Priorisierung, Kapazität, Wartungsfenster, Vorgängerbeziehungen, Freigaben, Auslastung, deterministische Ergebnisse und geschützte Berichtsausgabe. Der Beispielbericht wurde zusätzlich auf Desktop und Mobilansicht im Browser bedient.

## HTTP-Anwendung

Zusätzlich zum vollständigen CLI-Planer: `PORT=8080 ./build/sample_server`. `/` zeigt den Leitstand mit drei Planungsregeln, Kapazitätsvergleich, Gantt und SVG-Export. `/api/dns` verwendet getaddrinfo. `/api/build` nennt eingebundene Bibliotheken. Vor dem A21-CMake-Build `sh prepare-libpq.sh` ausführen. Die vendorte PostgreSQL-Version ist eine reproduzierbare Compiler-Fixture, kein Produktions-Datenbankserver.


## Compiler-Fall und Varianten

C++ cpp-httplib, statisch, mit `getaddrinfo` (Linker-Warnung NSS)

Erwartung auf der Lily-Plattform: startet, Bind und Antwort 200

[Prüfablauf und Gegenprobe](scenario.json). Lokale Builds sind keine Bestätigung des Wasm-/Lily-Pfads.

- [.](./): cpp · Produktionsplanung, Wartung, drei Heuristiken, Kapazitätsvergleich, Gantt, SVG/CSV/JSON und CLI
