FROM oven/bun:latest

WORKDIR /

COPY . .

RUN bun install

CMD ["bun", "run", "dev"]

EXPOSE 3000