# Build context: repository root (docker build -f server/Dockerfile .)
FROM rust:1.83-bookworm AS builder
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*
COPY proto ./proto
COPY server ./server
WORKDIR /build/server
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /build/server/target/release/server /usr/local/bin/metrics-server
ENV GRPC_BIND_ADDR=0.0.0.0:3000
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/metrics-server"]
