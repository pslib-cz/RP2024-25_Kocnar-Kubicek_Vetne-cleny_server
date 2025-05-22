FROM oven/bun:latest

WORKDIR /app
COPY . .

RUN apt-get update -y && apt-get install -y openssl
RUN bun install

EXPOSE 5173
EXPOSE 8080

USER bun
RUN ls -la

ENTRYPOINT ["bun", "index.ts"]