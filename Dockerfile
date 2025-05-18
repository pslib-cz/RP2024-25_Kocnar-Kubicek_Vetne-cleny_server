FROM oven/bun:latest

WORKDIR /app
COPY . .

RUN bun install

EXPOSE 5173/tcp

USER bun
COPY entrypoint.sh .
RUN ls -la

ENTRYPOINT ["./entrypoint.sh"]