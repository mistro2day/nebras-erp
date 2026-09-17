# Dockerfile for deepwiki-rs (Litho) Architecture Engine
FROM rust:1.80-slim-bullseye AS builder

WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y pkg-config libssl-dev git ca-certificates && rm -rf /var/lib/apt/lists/*

RUN cargo install deepwiki-rs

FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y libssl1.1 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/local/cargo/bin/deepwiki-rs /usr/local/bin/deepwiki-rs

WORKDIR /workspace

ENTRYPOINT ["deepwiki-rs"]
CMD ["-p", ".", "-o", "./docs/architecture"]
