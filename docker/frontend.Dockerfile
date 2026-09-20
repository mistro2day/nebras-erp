FROM alpine:latest
WORKDIR /dist
COPY frontend/dist/nebras-erp/browser /dist
CMD ["sh", "-c", "sleep infinity"]
