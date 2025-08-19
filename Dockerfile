FROM oven/bun:latest

WORKDIR /

COPY . .

RUN bun install

CMD ["bun", "run", "build"]

EXPOSE 3000