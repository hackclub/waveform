FROM oven/bun:latest

WORKDIR /app

COPY package.json ./

RUN bun install
RUN bun i -g serve

COPY . .

EXPOSE 3000
RUN bun run build
CMD [ "bun", "index.ts" ]