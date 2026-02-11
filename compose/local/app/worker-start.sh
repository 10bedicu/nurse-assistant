#!/bin/sh
set -e

# Wait for the app service to finish installing dependencies
echo "Waiting for dependencies..."
while [ ! -f /app/node_modules/.install-done ]; do
  sleep 2
done
echo "Dependencies ready."

# Start worker
pnpm worker:watch
