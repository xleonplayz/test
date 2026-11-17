# A24 · C++-Layout `backend/CMakeLists.txt` + `backend/src/main.cpp`

Erwartung auf der Lily-Plattform: Root ist `backend`

[Prüfablauf und Gegenprobe](scenario.json). Diese Apps sind synthetische Nachbauten. Lokale Builds und echte HTTP-Tests prüfen die App-Funktion; der Plattformfall und seine Gegenprobe gegen eine alte Version bleiben separat offen.

## Apps

- [backend](backend/): cpp · Produktionsplanung, Wartung, drei Heuristiken, Kapazitätsvergleich, Gantt, SVG/CSV/JSON und CLI
