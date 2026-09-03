/* Der Bestelldienst: der Zustandsautomat der Plattform.
 *
 *   GET  /health                {"ok":true,"app":"orders","count":N}
 *   GET  /topology              wen er ruft (niemanden), wer ihn ruft (api)
 *   GET  /orders                alle Bestellungen
 *   GET  /orders/<id>           eine Bestellung
 *   POST /orders                neu anlegen
 *   POST /orders/<id>/state     Zustand wechseln
 *
 * Zwei Betriebsarten, EIN Handler -- wie bei den Schwesterdiensten:
 *
 *   ohne Argument   Cap-Modus: rohe HTTP-Anfrage auf stdin, Antwort nach stdout
 *   --serve         Entwicklermodus: HTTP-Server auf PORT (nicht auf der Cap)
 *
 * # Warum dieser Dienst als einziger einen Speicher hat
 *
 * inventory und pricing halten ihre Daten im Code -- sie ANTWORTEN nur.
 * Eine Bestellung entsteht dagegen zur Laufzeit und muss die Anfrage
 * ueberleben, die sie angelegt hat. Auf der Cap ist das keine
 * Bequemlichkeit, sondern die einzige Moeglichkeit: dort wird die App
 * PRO ANFRAGE gestartet, ein Prozessspeicher waere nach der Antwort weg.
 * Der Ablageort kommt aus `ORDERS_STORE`.
 *
 * Damit ist auch die Grenze benannt: haelt der Wirt das Dateisystem
 * nicht fest, ueberlebt eine Bestellung den Neustart nicht. Der Dienst
 * behauptet keine Dauerhaftigkeit, die er nicht hat -- `/health` nennt
 * den Ablageort, damit man beim Nachsehen nicht raten muss.
 *
 * # Warum das Ablageformat kein JSON ist
 *
 * Die C++-Standardbibliothek hat keinen JSON-Leser, und eine vendorierte
 * Kopfdatei nur fuer den eigenen Speicher waere eine Abhaengigkeit, die
 * der statische Bau nicht braucht. Nach AUSSEN spricht der Dienst JSON;
 * nach innen eine tabgetrennte Zeile je Bestellung. Das Trennzeichen ist
 * genau deshalb der Tab: Kundennamen haben Leerzeichen, aber keine Tabs
 * -- und was doch einen enthaelt, wird beim Anlegen abgewiesen statt
 * still verstuemmelt.
 *
 * # Der Zustandsautomat
 *
 *   created ──▶ paid ──▶ fulfilled
 *      │         │
 *      └────┬────┘
 *           ▼
 *       cancelled
 *
 * Ein unerlaubter Wechsel ist eine ANTWORT mit Grund, kein Fehler --
 * dieselbe Regel wie beim Teilausfall in api. Wer `fulfilled` aus
 * `created` verlangt, bekommt gesagt, dass die Zahlung fehlt.
 */
#include <algorithm>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <ctime>
#include <fstream>
#include <iostream>
#include <map>
#include <optional>
#include <sstream>
#include <string>
#include <vector>

namespace {

// ---------------------------------------------------------------- Modell

struct Zeile {
    std::string sku;
    long qty = 0;
};

struct Bestellung {
    std::string id;
    std::string state;      // created | paid | fulfilled | cancelled
    std::string customer;
    std::vector<Zeile> zeilen;
    long angelegt = 0;      // Unix-Sekunden
};

/* Die erlaubten Wechsel. Als Tabelle und nicht als if-Kette, weil die
 * Regel dann an EINER Stelle steht und die Fehlermeldung sie vorlesen
 * kann -- eine Kette muss man lesen, um zu wissen, was erlaubt gewesen
 * waere. */
const std::map<std::string, std::vector<std::string>> UEBERGAENGE = {
    {"created",   {"paid", "cancelled"}},
    {"paid",      {"fulfilled", "cancelled"}},
    {"fulfilled", {}},
    {"cancelled", {}},
};

// ------------------------------------------------------------ JSON-Ausgabe

/* Nur so viel Kodierung, wie ein JSON-String braucht. Ohne das kippt
 * jeder Kundenname mit Anfuehrungszeichen die Antwort -- und zwar erst
 * beim Leser, weit weg von hier. */
std::string js(const std::string& s) {
    std::string out = "\"";
    for (char c : s) {
        switch (c) {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default:
                if (static_cast<unsigned char>(c) < 0x20) {
                    char buf[8];
                    std::snprintf(buf, sizeof buf, "\\u%04x", c);
                    out += buf;
                } else {
                    out += c;
                }
        }
    }
    return out + "\"";
}

std::string als_json(const Bestellung& b) {
    std::ostringstream o;
    o << "{\"id\":" << js(b.id)
      << ",\"state\":" << js(b.state)
      << ",\"customer\":" << js(b.customer)
      << ",\"created_at\":" << b.angelegt
      << ",\"lines\":[";
    for (size_t i = 0; i < b.zeilen.size(); i++) {
        if (i) o << ",";
        o << "{\"sku\":" << js(b.zeilen[i].sku) << ",\"qty\":" << b.zeilen[i].qty << "}";
    }
    o << "]}";
    return o.str();
}

std::string fehler(const std::string& grund, const std::string& feld = "",
                   const std::string& wert = "") {
    std::ostringstream o;
    o << "{\"error\":" << js(grund);
    if (!feld.empty()) o << ",\"" << feld << "\":" << js(wert);
    o << "}";
    return o.str();
}

// ------------------------------------------------------------------ Speicher

std::string ablageort() {
    const char* p = std::getenv("ORDERS_STORE");
    return p && *p ? p : "/tmp/orders.store";
}

std::vector<std::string> trenne(const std::string& s, char t) {
    std::vector<std::string> teile;
    std::string feld;
    std::istringstream ein(s);
    while (std::getline(ein, feld, t)) teile.push_back(feld);
    return teile;
}

/* Zeilen laden. Eine kaputte Zeile wird UEBERSPRUNGEN, nicht geworfen:
 * eine halb geschriebene Datei darf den ganzen Dienst nicht stumm
 * machen -- die uebrigen Bestellungen sind noch da und gehoeren
 * ausgeliefert. */
std::vector<Bestellung> laden() {
    std::vector<Bestellung> alle;
    std::ifstream ein(ablageort());
    if (!ein) return alle;
    std::string zeile;
    while (std::getline(ein, zeile)) {
        if (zeile.empty()) continue;
        auto f = trenne(zeile, '\t');
        if (f.size() < 5) continue;
        Bestellung b;
        b.id = f[0];
        b.state = f[1];
        b.customer = f[2];
        b.angelegt = std::strtol(f[4].c_str(), nullptr, 10);
        for (const auto& paar : trenne(f[3], ',')) {
            auto dp = paar.find(':');
            if (dp == std::string::npos) continue;
            Zeile z;
            z.sku = paar.substr(0, dp);
            z.qty = std::strtol(paar.c_str() + dp + 1, nullptr, 10);
            if (!z.sku.empty() && z.qty > 0) b.zeilen.push_back(z);
        }
        alle.push_back(b);
    }
    return alle;
}

/* Erst neben die Datei schreiben, dann umbenennen. Ein `rename` im
 * selben Verzeichnis ist unteilbar: ein Leser sieht entweder den alten
 * oder den neuen Stand, nie einen halben. Ohne das wuerde ein Absturz
 * mitten im Schreiben alle Bestellungen kosten, nicht nur die neue. */
bool sichern(const std::vector<Bestellung>& alle) {
    const std::string ziel = ablageort();
    const std::string tmp = ziel + ".neu";
    {
        std::ofstream aus(tmp, std::ios::trunc);
        if (!aus) return false;
        for (const auto& b : alle) {
            std::string zeilen;
            for (size_t i = 0; i < b.zeilen.size(); i++) {
                if (i) zeilen += ",";
                zeilen += b.zeilen[i].sku + ":" + std::to_string(b.zeilen[i].qty);
            }
            aus << b.id << '\t' << b.state << '\t' << b.customer << '\t'
                << zeilen << '\t' << b.angelegt << '\n';
        }
        if (!aus) return false;
    }
    return std::rename(tmp.c_str(), ziel.c_str()) == 0;
}

/* Die naechste Nummer aus dem Bestand, nicht aus einer Uhr oder einem
 * Zufall: die Kennung landet in einer Oberflaeche und in einer Rechnung,
 * und `o-1004` liest sich, `o-1725310481` nicht. */
std::string naechste_id(const std::vector<Bestellung>& alle) {
    long groesste = 1000;
    for (const auto& b : alle) {
        if (b.id.size() > 2 && b.id.compare(0, 2, "o-") == 0) {
            long n = std::strtol(b.id.c_str() + 2, nullptr, 10);
            if (n > groesste) groesste = n;
        }
    }
    return "o-" + std::to_string(groesste + 1);
}

// -------------------------------------------------------------- Rumpf lesen

/* Prozentdekodierung fuer `application/x-www-form-urlencoded`.
 *
 * Warum der Rumpf nicht JSON ist: siehe Dateikopf. Wer hier hereinkommt,
 * ist `api` -- ein Gateway, das jede Kodierung erzeugen kann -- und
 * Formularkodierung braucht keinen Leser, den die Standardbibliothek
 * nicht hat. */
std::string entpacke(const std::string& s) {
    std::string out;
    for (size_t i = 0; i < s.size(); i++) {
        if (s[i] == '+') {
            out += ' ';
        } else if (s[i] == '%' && i + 2 < s.size()) {
            auto hex = [](char c) -> int {
                if (c >= '0' && c <= '9') return c - '0';
                if (c >= 'a' && c <= 'f') return c - 'a' + 10;
                if (c >= 'A' && c <= 'F') return c - 'A' + 10;
                return -1;
            };
            int h = hex(s[i + 1]), l = hex(s[i + 2]);
            if (h >= 0 && l >= 0) {
                out += static_cast<char>(h * 16 + l);
                i += 2;
            } else {
                out += s[i];
            }
        } else {
            out += s[i];
        }
    }
    return out;
}

std::map<std::string, std::string> felder(const std::string& rumpf) {
    std::map<std::string, std::string> m;
    for (const auto& paar : trenne(rumpf, '&')) {
        auto gl = paar.find('=');
        if (gl == std::string::npos) continue;
        m[entpacke(paar.substr(0, gl))] = entpacke(paar.substr(gl + 1));
    }
    return m;
}

/* Tabs und Zeilenumbrueche wuerden das Ablageformat zerlegen. Sie hier
 * abzuweisen ist ehrlicher, als sie still zu entfernen: der Aufrufer
 * erfaehrt, dass sein Wert nicht angekommen ist. */
bool speicherbar(const std::string& s) {
    return s.find('\t') == std::string::npos && s.find('\n') == std::string::npos &&
           s.find('\r') == std::string::npos;
}

// -------------------------------------------------------------- Der Handler

/* Die eine Wahrheit: Methode, Pfad und Rumpf hinein, JSON heraus. */
std::string antwort(const std::string& method, const std::string& rohpfad,
                    const std::string& rumpf) {
    const std::string pfad = rohpfad.substr(0, rohpfad.find('?'));

    if (method == "GET" && (pfad == "/" || pfad == "/health")) {
        std::ostringstream o;
        o << "{\"ok\":true,\"app\":\"orders\",\"count\":" << laden().size()
          << ",\"store\":" << js(ablageort()) << "}";
        return o.str();
    }
    if (method == "GET" && pfad == "/topology") {
        return "{\"app\":\"orders\",\"calls\":[],\"called_by\":[\"api\"]}";
    }
    if (method == "GET" && pfad == "/orders") {
        auto alle = laden();
        std::ostringstream o;
        o << "{\"app\":\"orders\",\"orders\":[";
        for (size_t i = 0; i < alle.size(); i++) {
            if (i) o << ",";
            o << als_json(alle[i]);
        }
        o << "]}";
        return o.str();
    }
    if (method == "GET" && pfad.rfind("/orders/", 0) == 0) {
        const std::string id = pfad.substr(std::strlen("/orders/"));
        for (const auto& b : laden())
            if (b.id == id) return als_json(b);
        return fehler("unknown order", "id", id);
    }

    if (method == "POST" && pfad == "/orders") {
        auto f = felder(rumpf);
        const std::string kunde = f.count("customer") ? f["customer"] : "";
        const std::string zeilen = f.count("lines") ? f["lines"] : "";
        if (kunde.empty()) return fehler("customer fehlt");
        if (!speicherbar(kunde)) return fehler("customer enthaelt Tab oder Zeilenumbruch");

        Bestellung b;
        for (const auto& paar : trenne(zeilen, ',')) {
            auto dp = paar.find(':');
            if (dp == std::string::npos) continue;
            Zeile z;
            z.sku = paar.substr(0, dp);
            z.qty = std::strtol(paar.c_str() + dp + 1, nullptr, 10);
            if (z.sku.empty() || !speicherbar(z.sku) || z.qty <= 0) continue;
            b.zeilen.push_back(z);
        }
        /* Eine Bestellung ohne Zeilen ist keine Bestellung. Sie
         * anzulegen hiesse, den Fehler auf den naechsten Dienst zu
         * schieben -- pricing wuerde 0 zurueckgeben und alles saehe
         * richtig aus. */
        if (b.zeilen.empty()) return fehler("keine gueltige Zeile in `lines`", "lines", zeilen);

        auto alle = laden();
        b.id = naechste_id(alle);
        b.state = "created";
        b.customer = kunde;
        b.angelegt = static_cast<long>(std::time(nullptr));
        alle.push_back(b);
        if (!sichern(alle)) return fehler("Speichern fehlgeschlagen", "store", ablageort());
        return als_json(b);
    }

    if (method == "POST" && pfad.rfind("/orders/", 0) == 0 &&
        pfad.size() > std::strlen("/orders/") + 6 &&
        pfad.compare(pfad.size() - 6, 6, "/state") == 0) {
        const std::string id = pfad.substr(std::strlen("/orders/"),
                                           pfad.size() - std::strlen("/orders/") - 6);
        auto f = felder(rumpf);
        const std::string ziel = f.count("state") ? f["state"] : "";
        if (ziel.empty()) return fehler("state fehlt");

        auto alle = laden();
        auto it = std::find_if(alle.begin(), alle.end(),
                               [&](const Bestellung& b) { return b.id == id; });
        if (it == alle.end()) return fehler("unknown order", "id", id);

        auto regel = UEBERGAENGE.find(it->state);
        const std::vector<std::string> erlaubt =
            regel == UEBERGAENGE.end() ? std::vector<std::string>{} : regel->second;
        if (std::find(erlaubt.begin(), erlaubt.end(), ziel) == erlaubt.end()) {
            /* Der Grund nennt, was erlaubt GEWESEN waere. Ein blosses
             * "nicht erlaubt" zwingt den Aufrufer, die Tabelle zu
             * kennen -- und die steht hier, nicht bei ihm. */
            std::ostringstream o;
            o << "{\"error\":\"unerlaubter Wechsel\",\"id\":" << js(id)
              << ",\"from\":" << js(it->state) << ",\"to\":" << js(ziel) << ",\"allowed\":[";
            for (size_t i = 0; i < erlaubt.size(); i++) {
                if (i) o << ",";
                o << js(erlaubt[i]);
            }
            o << "]}";
            return o.str();
        }
        it->state = ziel;
        if (!sichern(alle)) return fehler("Speichern fehlgeschlagen", "store", ablageort());
        return als_json(*it);
    }

    std::ostringstream o;
    o << "{\"error\":\"not found\",\"method\":" << js(method) << ",\"path\":" << js(pfad) << "}";
    return o.str();
}

// ------------------------------------------------- Rohe HTTP-Nachricht zerlegen

struct Anfrage {
    std::string method = "GET";
    std::string pfad = "/";
    std::string rumpf;
};

/* Anders als bei den GET-Diensten reicht die erste Zeile hier NICHT:
 * ein POST traegt seine Nutzlast hinter der Leerzeile. Der Rumpf ist
 * alles danach -- Content-Length wird bewusst nicht ausgewertet, weil
 * im Cap-Modus der Strom ohnehin mit der Anfrage endet. */
Anfrage zerlege(const std::string& roh) {
    Anfrage a;
    std::istringstream ein(roh);
    std::string erste;
    std::getline(ein, erste);
    if (!erste.empty() && erste.back() == '\r') erste.pop_back();
    std::istringstream zeile(erste);
    std::string m, p;
    if (zeile >> m >> p) {
        a.method = m;
        a.pfad = p;
    }
    const auto trennung = roh.find("\r\n\r\n");
    if (trennung != std::string::npos) {
        a.rumpf = roh.substr(trennung + 4);
    } else {
        const auto t2 = roh.find("\n\n");
        if (t2 != std::string::npos) a.rumpf = roh.substr(t2 + 2);
    }
    return a;
}

/* Cap-Modus: eine Anfrage von stdin, eine Antwort nach stdout, Ende.
 * Der GANZE Strom wird gelesen, nicht die erste Zeile -- sonst faende
 * ein POST seinen Rumpf nicht. */
int einmal() {
    std::ostringstream puffer;
    puffer << std::cin.rdbuf();
    const Anfrage a = zerlege(puffer.str());
    std::cout << antwort(a.method, a.pfad, a.rumpf) << std::endl;
    return 0;
}

}  // namespace

#ifndef __wasi__
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

namespace {

/* Entwicklermodus: ein HTTP-Server auf PORT, derselbe Handler.
 *
 * Ein POST-Rumpf kann in einem zweiten Paket kommen; deshalb wird bis
 * zur Laenge aus `Content-Length` weitergelesen. Ein einziges `read`
 * liefert bei groesseren Bestellungen sonst einen abgeschnittenen
 * Rumpf, und der Fehler saehe wie ein Formatfehler des Aufrufers aus. */
int serve() {
    const char* p = std::getenv("PORT");
    const int port = p ? std::atoi(p) : 8084;
    const int s = socket(AF_INET, SOCK_STREAM, 0);
    int eins = 1;
    setsockopt(s, SOL_SOCKET, SO_REUSEADDR, &eins, sizeof eins);
    sockaddr_in adr{};
    adr.sin_family = AF_INET;
    adr.sin_addr.s_addr = htonl(INADDR_ANY);
    adr.sin_port = htons(static_cast<unsigned short>(port));
    if (bind(s, reinterpret_cast<sockaddr*>(&adr), sizeof adr) < 0 || listen(s, 16) < 0) {
        std::perror("orders: bind");
        return 1;
    }
    std::fprintf(stderr, "orders: listening on :%d (store=%s)\n", port, ablageort().c_str());
    for (;;) {
        const int c = accept(s, nullptr, nullptr);
        if (c < 0) continue;
        std::string roh;
        char buf[4096];
        ssize_t n;
        while ((n = read(c, buf, sizeof buf)) > 0) {
            roh.append(buf, static_cast<size_t>(n));
            const auto kopfende = roh.find("\r\n\r\n");
            if (kopfende == std::string::npos) continue;
            size_t laenge = 0;
            const auto cl = roh.find("Content-Length:");
            if (cl != std::string::npos && cl < kopfende)
                laenge = static_cast<size_t>(std::strtoul(roh.c_str() + cl + 15, nullptr, 10));
            if (roh.size() >= kopfende + 4 + laenge) break;
        }
        const Anfrage a = zerlege(roh);
        const std::string body = antwort(a.method, a.pfad, a.rumpf);
        char kopf[256];
        const int kl = std::snprintf(kopf, sizeof kopf,
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n"
            "Content-Length: %zu\r\nConnection: close\r\n\r\n", body.size());
        if (write(c, kopf, static_cast<size_t>(kl)) < 0 ||
            write(c, body.data(), body.size()) < 0) { /* Verbindung weg */ }
        close(c);
    }
}

}  // namespace
#else
namespace {
int serve() {
    std::fprintf(stderr,
        "orders: --serve gibt es auf der Cap nicht; dort laeuft der Dienst pro Anfrage\n");
    return einmal();
}
}  // namespace
#endif

int main(int argc, char** argv) {
    for (int i = 1; i < argc; i++)
        if (std::strcmp(argv[i], "--serve") == 0) return serve();
    return einmal();
}
