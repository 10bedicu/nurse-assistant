# Use the official Node.js image
FROM node:20-slim

# Install pnpm and required dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable && corepack prepare pnpm@latest --activate

# Set the working directory inside the container
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

RUN pnpm prisma migrate deploy
RUN pnpm prisma generate

CMD pnpm start