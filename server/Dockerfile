# Build context: repository root (docker build -f server/Dockerfile .)
# Use current stable Rust (1.83 is too old for some crate releases in 2026).
FROM rust:bookworm AS builder
WORKDIR /build
COPY proto ./proto
# Cargo.lock must be committed (see server/.gitignore — do not ignore it)
COPY server ./server
WORKDIR /build/server
RUN cargo build --release --locked -j 1

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /build/server/target/release/server /usr/local/bin/metrics-server
ENV GRPC_BIND_ADDR=0.0.0.0:3000
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/metrics-server"]
