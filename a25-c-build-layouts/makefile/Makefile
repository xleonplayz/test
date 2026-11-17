CC ?= cc
CFLAGS ?= -std=c11 -O2 -Wall -Wextra -Wpedantic
all: fokus
fokus: main.c page.h
	$(CC) $(CFLAGS) main.c -o fokus
test: fokus
	python3 test.py
clean:
	rm -f fokus
.PHONY: all test clean
