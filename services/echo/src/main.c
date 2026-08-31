/* echo — der Gerufene im App-zu-App-Beweis.
 *
 * Er tut absichtlich fast nichts: Er nimmt die Anfrage, die ihm gereicht
 * wird, und gibt sie zurueck. Damit ist die Antwort BYTE-GENAU von der
 * Eingabe abhaengig, und ein Aufruf, der "irgendwie geantwortet" hat,
 * laesst sich von einem unterscheiden, der wirklich DIESE Anfrage
 * getragen hat.
 *
 *   ohne Argument   Cap-Modus: Anfrage auf stdin, Antwort nach stdout
 *   --serve         gewoehnlicher HTTP-Server auf PORT (Entwicklermaschine)
 *
 * Auf der Cap wird die App pro Anfrage gestartet; ein Listener lebte nur,
 * solange der Lauf dauert. Beide Wege rufen `antwort()` — es gibt keine
 * zweite Wahrheit darueber, was der Dienst sagt.
 */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

/* Was in die Antwort darf: alles ausser dem, was JSON zerreisst. Der
 * Pfad kommt von aussen, also wird er hier entschaerft und nicht
 * geglaubt. */
static void json_escape(const char *ein, char *aus, size_t kap) {
    size_t j = 0;
    for (size_t i = 0; ein[i] && j + 2 < kap; i++) {
        unsigned char c = (unsigned char)ein[i];
        if (c == '"' || c == '\\') {
            aus[j++] = '\\';
            aus[j++] = (char)c;
        } else if (c >= 0x20 && c < 0x7f) {
            aus[j++] = (char)c;
        }
        /* Steuerzeichen fallen weg: sie haben in einer Kennung nichts
         * verloren, und ein \u-Ausdruck waere hier nur Ballast. */
    }
    aus[j] = '\0';
}

static void anfragezeile(const char *roh, char *method, size_t mk, char *path, size_t pk) {
    if (sscanf(roh, "%15s %511s", method, path) < 2) {
        strncpy(method, "GET", mk); method[mk - 1] = '\0';
        strncpy(path, "/", pk);     path[pk - 1] = '\0';
    }
}

/* Die Fassung dieses Bauwerks. Sie steht in der Antwort, damit ein
 * REDEPLOY von aussen nachweisbar ist: dieselbe App, dieselbe Adresse,
 * eine andere Zahl. Ohne sie waere "es hat geantwortet" alles, was man
 * ueber einen Tausch sagen koennte. */
#define FASSUNG 2

static void antwort(const char *method, const char *path, char *aus, size_t kap) {
    char m[64], p[600];
    json_escape(method, m, sizeof m);
    json_escape(path, p, sizeof p);
    snprintf(aus, kap,
             "{\"app\":\"echo\",\"fassung\":%d,\"method\":\"%s\",\"path\":\"%s\"}",
             FASSUNG, m, p);
}

static int einmal(void) {
    char roh[8192] = {0};
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

static int serve(void) {
    const char *hafen = getenv("PORT");
    int port = hafen ? atoi(hafen) : 8084;
    int s = socket(AF_INET, SOCK_STREAM, 0);
    int an = 1;
    setsockopt(s, SOL_SOCKET, SO_REUSEADDR, &an, sizeof an);
    struct sockaddr_in adr = {0};
    adr.sin_family = AF_INET;
    adr.sin_addr.s_addr = INADDR_ANY;
    adr.sin_port = htons((unsigned short)port);
    if (bind(s, (struct sockaddr *)&adr, sizeof adr) < 0) return 1;
    if (listen(s, 16) < 0) return 1;
    fprintf(stderr, "echo: listening on :%d\n", port);
    for (;;) {
        int c = accept(s, NULL, NULL);
        if (c < 0) continue;
        char roh[8192] = {0};
        ssize_t n = read(c, roh, sizeof roh - 1);
        if (n < 0) n = 0;
        roh[n] = '\0';
        char method[16], path[512], aus[1024], kopf[1400];
        anfragezeile(roh, method, sizeof method, path, sizeof path);
        antwort(method, path, aus, sizeof aus);
        int len = snprintf(kopf, sizeof kopf,
                           "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n"
                           "Content-Length: %zu\r\nConnection: close\r\n\r\n%s",
                           strlen(aus), aus);
        if (len > 0) (void)!write(c, kopf, (size_t)len);
        close(c);
    }
}
#else
static int serve(void) {
    fprintf(stderr, "echo: --serve gibt es auf der Cap nicht; dort laeuft der Dienst pro Anfrage\n");
    return einmal();
}
#endif

int main(int argc, char **argv) {
    for (int i = 1; i < argc; i++)
        if (strcmp(argv[i], "--serve") == 0) return serve();
    return einmal();
}
