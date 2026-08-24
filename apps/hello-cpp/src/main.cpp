// Der kleinste C++-Dienst, der die ganze Kette beweist.
//
// Ohne Fremdbibliotheken, mit Absicht: `apps/api-cpp` bindet libpq ein,
// und die gibt es fuer wasm32-wasi nicht. Was hier schiefgeht, liegt an
// der Kette, nicht an einer fehlenden Abhaengigkeit.
#include <cstdio>
#include <cstdlib>

int main() {
    const char* hafen = std::getenv("PORT");
    std::printf("hello-cpp laeuft auf %s\n", hafen ? hafen : "8080");
    return 0;
}
