#!/bin/sh
set -e

# Keep pnpm store inside the container, not in the bind-mounted project dir
export PNPM_HOME="/root/.local/share/pnpm"
pnpm config set store-dir /root/.local/share/pnpm/store

# Install dependencies into the Docker volume (Linux-native binaries).
pnpm install --frozen-lockfile --force

# Generate Prisma client
pnpm prisma generate

# Signal to worker that dependencies are ready
touch /app/node_modules/.install-done

# Start dev server and Prisma Studio
pnpm dev & pnpm prisma studio
