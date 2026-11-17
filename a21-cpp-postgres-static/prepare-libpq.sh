#!/bin/sh
set -eu
mkdir -p .deps
if [ ! -f .deps/pg/lib/libpq.a ]; then
  tar -xjf vendor/postgresql-16.6.tar.bz2 -C .deps
  root=$(pwd)
  cd .deps/postgresql-16.6
  ./configure --prefix="$root/.deps/pg" --without-readline --without-zlib --without-icu --without-openssl --without-gssapi --without-ldap --without-lz4 --without-zstd
  make -C src/interfaces/libpq -j2
  make -C src/interfaces/libpq install
  make -C src/include install
fi
