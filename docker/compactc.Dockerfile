FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        unzip \
        xz-utils \
    && rm -rf /var/lib/apt/lists/*

ARG TARGETARCH
ARG COMPACTC_VERSION=0.30.0

ENV COMPACT_HOME="/opt/compactc"
ENV PATH="/opt/compactc:/usr/local/bin:${PATH}"

RUN set -eux; \
    case "${TARGETARCH:-amd64}" in \
        "amd64") COMPACT_ARCH="x86_64-unknown-linux-musl" ;; \
        "arm64") COMPACT_ARCH="aarch64-unknown-linux-musl" ;; \
        *) echo "Unsupported TARGETARCH: ${TARGETARCH}" && exit 1 ;; \
    esac; \
    mkdir -p /opt/compactc; \
    curl --proto '=https' --tlsv1.2 -fsSL \
        "https://github.com/LFDT-Minokawa/compact/releases/download/compactc-v${COMPACTC_VERSION}/compactc_v${COMPACTC_VERSION}_${COMPACT_ARCH}.zip" \
        -o /tmp/compactc.zip; \
    unzip -q /tmp/compactc.zip -d /opt/compactc; \
    rm -f /tmp/compactc.zip; \
    chmod -R +x /opt/compactc; \
    /opt/compactc/compactc --version

WORKDIR /workspace
ENTRYPOINT ["/opt/compactc/compactc"]
