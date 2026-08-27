/* Der Preisdienst: was ein Artikel kostet, mit Mengenrabatt.
 *
 *   GET /health                {"ok":true,"app":"pricing"}
 *   GET /price/<sku>?qty=N     {"sku":..,"unit_cents":..,"qty":N,"total_cents":..}
 *   GET /topology              wen er ruft (niemanden), wer ihn ruft (api)
 *
 * Zwei Betriebsarten, EIN Handler — wie beim Lagerdienst:
 *
 *   ohne Argument   Cap-Modus: rohe HTTP-Anfrage auf stdin, Antwort nach stdout
 *   --serve         Entwicklermodus: HTTP-Server auf PORT (nicht auf der Cap)
 *
 * Der Dienst haelt seine Preisliste selbst. Er kennt den Lagerbestand
 * NICHT — das ist Sache von `inventory`, und wer beides braucht, fragt
 * `api`, das die Antworten zusammenlegt. So bleibt jeder Dienst fuer
 * eine Sache zustaendig, und die Abhaengigkeiten zeigen in eine Richtung. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct preis { const char *sku; long cents; };

static const struct preis PREISE[] = {
    { "lamp-01",  4990 },
    { "desk-02", 54900 },
    { "chair-03", 24900 },
    { "cable-04",   890 },
};

static long rabatt_prozent(long qty) {
    if (qty >= 50) return 15;
    if (qty >= 10) return 10;
    if (qty >= 3)  return 5;
    return 0;
}

/* `?qty=N` aus dem Pfad, sonst 1. Alles andere in der Query ist egal. */
static long menge(const char *query) {
    const char *q = query ? strstr(query, "qty=") : NULL;
    long n = q ? strtol(q + 4, NULL, 10) : 1;
    return n > 0 ? n : 1;
}

/* Die eine Wahrheit: Methode und Pfad hinein, JSON in `aus`. */
static void antwort(const char *method, const char *pfad, char *aus, size_t kap) {
    char path[512];
    strncpy(path, pfad, sizeof path - 1);
    path[sizeof path - 1] = '\0';
    char *query = strchr(path, '?');
    if (query) { *query = '\0'; query++; }

    if (strcmp(method, "GET") != 0) {
        snprintf(aus, kap, "{\"error\":\"method not allowed\",\"method\":\"%s\"}", method);
        return;
    }
    if (strcmp(path, "/health") == 0 || strcmp(path, "/") == 0) {
        snprintf(aus, kap, "{\"ok\":true,\"app\":\"pricing\"}");
        return;
    }
    if (strcmp(path, "/topology") == 0) {
        snprintf(aus, kap, "{\"app\":\"pricing\",\"calls\":[],\"called_by\":[\"api\"]}");
        return;
    }
    if (strncmp(path, "/price/", 7) == 0) {
        const char *sku = path + 7;
        for (size_t i = 0; i < sizeof PREISE / sizeof PREISE[0]; i++) {
            if (strcmp(PREISE[i].sku, sku) == 0) {
                long qty = menge(query);
                long rabatt = rabatt_prozent(qty);
                long total = PREISE[i].cents * qty * (100 - rabatt) / 100;
                snprintf(aus, kap,
                    "{\"sku\":\"%s\",\"unit_cents\":%ld,\"qty\":%ld,\"discount_percent\":%ld,\"total_cents\":%ld}",
                    sku, PREISE[i].cents, qty, rabatt, total);
                return;
            }
        }
        snprintf(aus, kap, "{\"error\":\"unknown sku\",\"sku\":\"%s\"}", sku);
        return;
    }
    snprintf(aus, kap, "{\"error\":\"not found\",\"path\":\"%s\"}", path);
}

/* Die Anfragezeile einer rohen HTTP-Nachricht: "GET /pfad HTTP/1.1". */
static void anfragezeile(const char *roh, char *method, size_t mk, char *path, size_t pk) {
    strncpy(method, "GET", mk); method[mk - 1] = '\0';
    strncpy(path, "/", pk);     path[pk - 1] = '\0';
    if (!roh) return;
    if (sscanf(roh, "%15s %511s", method, path) < 2) {
        strncpy(method, "GET", mk); method[mk - 1] = '\0';
        strncpy(path, "/", pk);     path[pk - 1] = '\0';
    }
}

/* Cap-Modus: eine Anfrage von stdin, eine Antwort nach stdout, Ende. */
static int einmal(void) {
    char roh[8192] = {0};
    /* Nur die erste Zeile: mehr braucht dieser Dienst nicht, und ein
     * leerer stdin (Smoke-Test ohne Anfrage) ist kein Fehler. */
    if (!fgets(roh, sizeof roh, stdin)) roh[0] = '\0';
    char method[16], path[512], aus[1024];
    anfragezeile(roh, method, sizeof method, path, sizeof path);
    antwort(method, path, aus, sizeof aus);
    printf("%s\n", aus);
    return 0;
}

#ifndef __wasi__
#include <unistd.h>
#include <netinet/in.h>
#include <sys/socket.h>

/* Entwicklermodus: ein HTTP-Server auf PORT, derselbe Handler. */
static int serve(void) {
    const char *p = getenv("PORT");
    int port = p ? atoi(p) : 8083;
    int s = socket(AF_INET, SOCK_STREAM, 0);
    int eins = 1;
    setsockopt(s, SOL_SOCKET, SO_REUSEADDR, &eins, sizeof eins);
    struct sockaddr_in adr = {0};
    adr.sin_family = AF_INET;
    adr.sin_addr.s_addr = htonl(INADDR_ANY);
    adr.sin_port = htons((unsigned short)port);
    if (bind(s, (struct sockaddr *)&adr, sizeof adr) < 0 || listen(s, 16) < 0) {
        perror("pricing: bind");
        return 1;
    }
    fprintf(stderr, "pricing: listening on :%d\n", port);
    for (;;) {
        int c = accept(s, NULL, NULL);
        if (c < 0) continue;
        char roh[8192] = {0};
        ssize_t n = read(c, roh, sizeof roh - 1);
        if (n < 0) n = 0;
        roh[n] = '\0';
        char method[16], path[512], aus[1024], kopf[256];
        anfragezeile(roh, method, sizeof method, path, sizeof path);
        antwort(method, path, aus, sizeof aus);
        int kl = snprintf(kopf, sizeof kopf,
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: %zu\r\nConnection: close\r\n\r\n",
            strlen(aus));
        if (write(c, kopf, (size_t)kl) < 0 || write(c, aus, strlen(aus)) < 0) { /* Verbindung weg */ }
        close(c);
    }
}
#else
static int serve(void) {
    fprintf(stderr, "pricing: --serve gibt es auf der Cap nicht; dort laeuft der Dienst pro Anfrage\n");
    return einmal();
}
#endif

int main(int argc, char **argv) {
    for (int i = 1; i < argc; i++)
        if (strcmp(argv[i], "--serve") == 0) return serve();
    return einmal();
}
