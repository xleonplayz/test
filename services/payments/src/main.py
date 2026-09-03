"""Der Zahlungsdienst: autorisieren, einziehen, erstatten.

    GET  /health                     {"ok":true,"app":"payments","count":N}
    GET  /topology                   wen er ruft (niemanden), wer ihn ruft (api)
    GET  /payments                   alle Zahlungen
    GET  /payments/<order_id>        die Zahlung zu einer Bestellung
    POST /payments/authorize         order_id, amount_cents, method
    POST /payments/<order_id>/capture
    POST /payments/<order_id>/refund

Zwei Betriebsarten, EIN Handler -- wie bei den Schwesterdiensten:

    ohne Argument   Cap-Modus: rohe HTTP-Anfrage auf stdin, Antwort nach stdout
    --serve         Entwicklermodus: HTTP-Server auf PORT (nicht auf der Cap)

# Warum eine Ablehnung deterministisch ist

Ein Zahlungsdienst, der immer zusagt, beweist nichts: der Weg, auf dem
eine Bestellung an der Zahlung scheitert, wird dann nie ausgefuehrt und
faellt erst im Betrieb auf. Hier entscheidet eine REGEL, kein Zufall --
zweimal dieselbe Anfrage gibt zweimal dieselbe Antwort, und ein Test
kann die Ablehnung anfahren, ohne es hundertmal zu versuchen.

Zwei Regeln, beide ueber die Umgebung verstellbar:

    Betrag ueber PAYMENTS_LIMIT_CENTS   -> declined, "limit exceeded"
    method endet auf `-decline`         -> declined, "test card"

# Der Zustandsautomat

    authorized ──▶ captured ──▶ refunded
         │
         └──▶ voided

`voided` ist der Abbruch VOR dem Einzug, `refunded` die Rueckgabe
danach. Beides ueber denselben Pfad `/refund` zu fuehren waere bequem
und falsch: bei `authorized` ist noch kein Geld geflossen, bei
`captured` schon, und wer die Buecher liest, muss das unterscheiden
koennen. Der Dienst waehlt den richtigen Zielzustand selbst.

# Warum das Ablageformat kein JSON ist

Wie beim Bestelldienst: nach aussen JSON, nach innen eine tabgetrennte
Zeile. Der Grund ist hier ein anderer -- Python HAT `json` --, aber der
Gast-Python der Kette ist jung, und ein Dienst, der zum Antworten ein
Modul braucht, das dort vielleicht fehlt, beweist weniger als einer, der
mit Zeichenketten auskommt. Was er ausgibt, ist trotzdem gueltiges JSON;
es wird nur von Hand gebaut.
"""
import os
import sys

# ------------------------------------------------------------------ Ablage

ZUSTAENDE_WEITER = {
    "authorized": ("captured", "voided"),
    "captured": ("refunded",),
    "declined": (),
    "voided": (),
    "refunded": (),
}


def ablageort():
    return os.environ.get("PAYMENTS_STORE") or "/tmp/payments.store"


def grenze():
    """Ab wann abgelehnt wird. Eine kaputte Angabe faellt auf die Vorgabe
    zurueck statt den Dienst zu stoppen -- eine unlesbare Umgebung ist
    kein Grund, gar nicht mehr zu antworten."""
    roh = os.environ.get("PAYMENTS_LIMIT_CENTS") or "100000"
    try:
        n = int(roh)
    except ValueError:
        return 100000
    return n if n > 0 else 100000


def laden():
    """Alle Zahlungen. Eine kaputte Zeile wird uebersprungen, nicht
    geworfen: eine halb geschriebene Datei darf die uebrigen Zahlungen
    nicht unsichtbar machen."""
    alle = []
    try:
        with open(ablageort(), "r", encoding="utf-8") as f:
            inhalt = f.read()
    except OSError:
        return alle
    for zeile in inhalt.split("\n"):
        if not zeile:
            continue
        feld = zeile.split("\t")
        if len(feld) < 6:
            continue
        try:
            betrag = int(feld[2])
        except ValueError:
            continue
        alle.append({
            "order_id": feld[0],
            "state": feld[1],
            "amount_cents": betrag,
            "method": feld[3],
            "reason": feld[4],
            "authorized_at": feld[5],
        })
    return alle


def sichern(alle):
    """Erst daneben schreiben, dann umbenennen -- ein `rename` im selben
    Verzeichnis ist unteilbar. Ohne das kostet ein Absturz mitten im
    Schreiben alle Zahlungen, nicht nur die neue."""
    ziel = ablageort()
    tmp = ziel + ".neu"
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            for z in alle:
                f.write("\t".join([
                    z["order_id"], z["state"], str(z["amount_cents"]),
                    z["method"], z["reason"], str(z["authorized_at"]),
                ]) + "\n")
        os.replace(tmp, ziel)
        return True
    except OSError:
        return False


def speicherbar(s):
    return "\t" not in s and "\n" not in s and "\r" not in s


# ------------------------------------------------------------ JSON von Hand

def js(s):
    """Nur so viel Kodierung, wie ein JSON-String braucht. Ohne das
    kippt jede Zahlungsart mit Anfuehrungszeichen die Antwort -- und
    zwar erst beim Leser, weit weg von hier."""
    out = ['"']
    for c in str(s):
        if c == '"':
            out.append('\\"')
        elif c == "\\":
            out.append("\\\\")
        elif c == "\n":
            out.append("\\n")
        elif c == "\r":
            out.append("\\r")
        elif c == "\t":
            out.append("\\t")
        elif ord(c) < 0x20:
            out.append("\\u%04x" % ord(c))
        else:
            out.append(c)
    out.append('"')
    return "".join(out)


def als_json(z):
    return (
        "{\"order_id\":" + js(z["order_id"])
        + ",\"state\":" + js(z["state"])
        + ",\"amount_cents\":" + str(z["amount_cents"])
        + ",\"method\":" + js(z["method"])
        + ",\"reason\":" + js(z["reason"])
        + ",\"authorized_at\":" + js(z["authorized_at"])
        + "}"
    )


def fehler(grund, **felder):
    teile = ["{\"error\":" + js(grund)]
    for k, v in felder.items():
        teile.append(",\"" + k + "\":" + js(v))
    return "".join(teile) + "}"


# ------------------------------------------------------------- Rumpf lesen

def entpacke(s):
    """Prozentdekodierung fuer `application/x-www-form-urlencoded`.

    Von Hand statt `urllib.parse.unquote`: siehe Modulkopf -- der
    Dienst soll mit Zeichenketten auskommen."""
    out = []
    i = 0
    while i < len(s):
        c = s[i]
        if c == "+":
            out.append(" ")
            i += 1
        elif c == "%" and i + 2 < len(s):
            try:
                out.append(chr(int(s[i + 1:i + 3], 16)))
                i += 3
            except ValueError:
                out.append(c)
                i += 1
        else:
            out.append(c)
            i += 1
    return "".join(out)


def felder(rumpf):
    m = {}
    for paar in rumpf.split("&"):
        if "=" not in paar:
            continue
        k, _, v = paar.partition("=")
        m[entpacke(k)] = entpacke(v)
    return m


# -------------------------------------------------------------- Der Handler

def antwort(method, rohpfad, rumpf):
    """Die eine Wahrheit: Methode, Pfad und Rumpf hinein, JSON heraus."""
    pfad = rohpfad.split("?")[0]

    if method == "GET" and pfad in ("/", "/health"):
        return ("{\"ok\":true,\"app\":\"payments\",\"count\":" + str(len(laden()))
                + ",\"limit_cents\":" + str(grenze())
                + ",\"store\":" + js(ablageort()) + "}")
    if method == "GET" and pfad == "/topology":
        return "{\"app\":\"payments\",\"calls\":[],\"called_by\":[\"api\"]}"
    if method == "GET" and pfad == "/payments":
        return ("{\"app\":\"payments\",\"payments\":["
                + ",".join(als_json(z) for z in laden()) + "]}")
    if method == "GET" and pfad.startswith("/payments/"):
        oid = pfad[len("/payments/"):]
        for z in laden():
            if z["order_id"] == oid:
                return als_json(z)
        return fehler("unknown payment", order_id=oid)

    if method == "POST" and pfad == "/payments/authorize":
        f = felder(rumpf)
        oid = f.get("order_id", "")
        art = f.get("method", "card")
        if not oid:
            return fehler("order_id fehlt")
        if not speicherbar(oid) or not speicherbar(art):
            return fehler("order_id oder method enthaelt Tab oder Zeilenumbruch")
        try:
            betrag = int(f.get("amount_cents", ""))
        except ValueError:
            return fehler("amount_cents fehlt oder ist keine Zahl",
                          amount_cents=f.get("amount_cents", ""))
        if betrag <= 0:
            return fehler("amount_cents muss positiv sein", amount_cents=str(betrag))

        alle = laden()
        # Eine zweite Autorisierung derselben Bestellung waere eine
        # zweite Belastung. Der bestehende Satz wird zurueckgegeben,
        # damit ein wiederholter Aufruf (Netz weg, Aufrufer probiert
        # erneut) nicht doppelt bucht.
        for z in alle:
            if z["order_id"] == oid:
                return als_json(z)

        if art.endswith("-decline"):
            zustand, grund = "declined", "test card"
        elif betrag > grenze():
            zustand, grund = "declined", "limit exceeded"
        else:
            zustand, grund = "authorized", ""
        satz = {
            "order_id": oid, "state": zustand, "amount_cents": betrag,
            "method": art, "reason": grund, "authorized_at": str(int(_jetzt())),
        }
        alle.append(satz)
        if not sichern(alle):
            return fehler("Speichern fehlgeschlagen", store=ablageort())
        return als_json(satz)

    if method == "POST" and pfad.startswith("/payments/") and (
            pfad.endswith("/capture") or pfad.endswith("/refund")):
        schritt = pfad.rsplit("/", 1)[1]
        oid = pfad[len("/payments/"):-len(schritt) - 1]
        alle = laden()
        satz = None
        for z in alle:
            if z["order_id"] == oid:
                satz = z
                break
        if satz is None:
            return fehler("unknown payment", order_id=oid)

        # `refund` waehlt seinen Zielzustand selbst: vor dem Einzug ist
        # es ein Abbruch (`voided`), danach eine Rueckgabe (`refunded`).
        # Siehe Modulkopf -- der Unterschied steht in den Buechern.
        if schritt == "capture":
            ziel = "captured"
        else:
            ziel = "refunded" if satz["state"] == "captured" else "voided"

        erlaubt = ZUSTAENDE_WEITER.get(satz["state"], ())
        if ziel not in erlaubt:
            return ("{\"error\":\"unerlaubter Wechsel\",\"order_id\":" + js(oid)
                    + ",\"from\":" + js(satz["state"]) + ",\"to\":" + js(ziel)
                    + ",\"allowed\":[" + ",".join(js(z) for z in erlaubt) + "]}")
        satz["state"] = ziel
        if not sichern(alle):
            return fehler("Speichern fehlgeschlagen", store=ablageort())
        return als_json(satz)

    return ("{\"error\":\"not found\",\"method\":" + js(method)
            + ",\"path\":" + js(pfad) + "}")


def _jetzt():
    """Die Uhr an EINER Stelle. Faellt `time` aus (junger Gast), ist die
    Antwort trotzdem eine Antwort -- der Zeitstempel ist Beiwerk, die
    Zahlung ist es nicht."""
    try:
        import time
        return time.time()
    except Exception:
        return 0


# ----------------------------------------------------- Rohe Nachricht zerlegen

def zerlege(roh):
    """Anders als bei den GET-Diensten reicht die erste Zeile hier NICHT:
    ein POST traegt seine Nutzlast hinter der Leerzeile."""
    erste = roh.split("\n", 1)[0].rstrip("\r")
    teile = erste.split()
    method = teile[0] if len(teile) > 0 else "GET"
    pfad = teile[1] if len(teile) > 1 else "/"
    if "\r\n\r\n" in roh:
        rumpf = roh.split("\r\n\r\n", 1)[1]
    elif "\n\n" in roh:
        rumpf = roh.split("\n\n", 1)[1]
    else:
        rumpf = ""
    return method, pfad, rumpf


def einmal():
    """Cap-Modus: eine Anfrage von stdin, eine Antwort nach stdout, Ende.
    Der GANZE Strom wird gelesen -- sonst faende ein POST seinen Rumpf
    nicht."""
    try:
        roh = sys.stdin.read()
    except Exception:
        roh = ""
    method, pfad, rumpf = zerlege(roh or "")
    print(antwort(method, pfad, rumpf))
    return 0


def serve():
    """Entwicklermodus: ein HTTP-Server auf PORT, derselbe Handler.

    `http.server` wird HIER importiert, nicht oben: auf der Cap gibt es
    keinen Listener, und ein Import auf Modulebene wuerde den Dienst
    dort schon beim Laden scheitern lassen -- also genau in der
    Betriebsart, in der er laufen soll."""
    from http.server import BaseHTTPRequestHandler, HTTPServer

    port = int(os.environ.get("PORT") or 8085)

    class Handler(BaseHTTPRequestHandler):
        def _antworte(self, method):
            laenge = int(self.headers.get("Content-Length") or 0)
            rumpf = self.rfile.read(laenge).decode("utf-8") if laenge else ""
            koerper = antwort(method, self.path, rumpf).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(koerper)))
            self.end_headers()
            self.wfile.write(koerper)

        def do_GET(self):
            self._antworte("GET")

        def do_POST(self):
            self._antworte("POST")

        def log_message(self, *_):
            pass

    sys.stderr.write("payments: listening on :%d (store=%s, limit=%d)\n"
                     % (port, ablageort(), grenze()))
    sys.stderr.flush()
    HTTPServer(("", port), Handler).serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(serve() if "--serve" in sys.argv else einmal())
