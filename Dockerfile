FROM oven/bun:latest

WORKDIR /app

COPY package.json ./

RUN bun install
RUN bun i -g serve

COPY . .

USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "index.ts" ]