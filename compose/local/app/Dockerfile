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

# Source code is bind-mounted from host.
# node_modules is a shared Docker volume — install happens at startup
# so native binaries are built for Linux, and both app & worker share it.

EXPOSE 3000

COPY compose/local/app/start.sh /start.sh
COPY compose/local/app/worker-start.sh /worker-start.sh
RUN chmod +x /start.sh /worker-start.sh

CMD ["/start.sh"]