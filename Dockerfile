FROM oven/bun:latest

WORKDIR /app

COPY package.json ./

RUN bun install
RUN apt-get update && apt-get install -y curl

COPY . .

USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "serve" ]