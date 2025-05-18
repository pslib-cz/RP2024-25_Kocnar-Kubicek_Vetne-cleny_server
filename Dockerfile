FROM oven/bun:latest

WORKDIR /app
COPY . .

RUN bun install

EXPOSE 5173/tcp

USER bun
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]