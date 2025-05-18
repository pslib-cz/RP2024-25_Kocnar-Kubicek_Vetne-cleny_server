FROM oven/bun:latest

WORKDIR /app
COPY . .

RUN apt-get update -y && apt-get install -y openssl
RUN bun install

EXPOSE 5173/tcp

USER bun
COPY entrypoint.sh .
RUN ls -la

ENTRYPOINT ["./entrypoint.sh"]