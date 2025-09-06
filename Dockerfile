FROM oven/bun:latest

WORKDIR /app
COPY . .

RUN apt-get update -y && apt-get install -y openssl
RUN bun install

EXPOSE 5173
EXPOSE 8080

USER bun
RUN ls -la
RUN bun x prisma generate

ENTRYPOINT ["bun", "index.ts"]