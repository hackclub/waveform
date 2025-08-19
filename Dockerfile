FROM oven/bun:latest

WORKDIR /app

COPY package.json ./

RUN bun install

COPY . .

USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "serve" ]