#!/bin/sh
set -eu
cc -std=c11 -O2 -Wall -Wextra -Wpedantic main.c -o fokus
