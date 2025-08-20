FROM oven/bun:1-slim

RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

EXPOSE 3000

CMD ["bun", "run", "serve"]