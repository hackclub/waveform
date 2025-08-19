FROM oven/bun:latest

WORKDIR /app

COPY package.json ./

RUN bun install
RUN bun i -g serve

COPY . .

EXPOSE 3000
CMD ["bun", "run", "build"]
ENTRYPOINT [ "serve", "-s", "/dist" ]