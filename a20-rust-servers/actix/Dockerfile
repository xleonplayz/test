FROM rust:1-bookworm AS builder
WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY web ./web
RUN cargo build --release --locked

FROM debian:bookworm-slim
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid app --no-create-home app && mkdir -p /app/data && chown app:app /app/data
WORKDIR /app
COPY --from=builder /build/target/release/funkraum /usr/local/bin/funkraum
USER app
EXPOSE 8080
ENTRYPOINT ["funkraum"]
CMD ["--host", "0.0.0.0", "--port", "8080", "--db", "/app/data/funkraum.sqlite"]
