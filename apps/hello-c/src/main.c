/* Der kleinste C-Dienst.
 *
 * C nimmt denselben Weg wie C++: staticc uebersetzt nach LLVM-IR,
 * analysiert, zerlegt und schreibt Bricks. Nur die Standardbibliothek
 * ist eine andere. */
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    const char *hafen = getenv("PORT");
    printf("{\"ok\":true,\"app\":\"hello-c\",\"port\":\"%s\"}\n", hafen ? hafen : "8080");
    return 0;
}
