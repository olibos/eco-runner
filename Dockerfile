FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY server/package.json server/
COPY avatars/package.json avatars/
RUN bun install --frozen-lockfile

COPY . .
RUN apt-get update && apt-get install -y curl && \
    mkdir -p src/track && \
    for f in LIBRARY.CMP LIBRARY.TTF SCENE.CMP SCENE.PRM SKY.CMP SKY.PRM TRACK.TRF TRACK.TRS TRACK.TRV TRACK.TEX; do \
        curl -sSL -H 'Referer: https://phoboslab.org/wipeout/' -H 'User-Agent: Mozilla/5.0' -o "src/track/$f" "https://phoboslab.org/wipeout/WIPEOUT2/TRACK01/$f"; \
    done
RUN bun run build
RUN bun build --compile server/index.ts --outfile server-bin

FROM gcr.io/distroless/base AS release
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-bin ./server-bin

EXPOSE 3000

CMD ["/app/server-bin"]
