# Nurse Assistant

An AI-powered assistant that helps nurses quickly find answers to context-specific questions, leveraging LLMs to provide accurate and relevant information.

![Screenshot](public/screenshots/screenshot.png)

> **Note:** This is a **pnpm-only** project. Please use pnpm for all package management.

## Prerequisites

Before running the project, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [pnpm](https://pnpm.io/) - Install via `npm install -g pnpm`
- [PostgreSQL](https://www.postgresql.org/) - Required for the database
- [Redis](https://redis.io/) - Required for the background job worker

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL="your-database-connection-string"

# Redis (optional - defaults to localhost:6379)
REDIS_URL="redis://localhost:6379"

# LLM Provider API Keys (at least one required)
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"      # Optional
GOOGLE_AI_API_KEY="your-google-ai-api-key"      # Optional

# Optional: Custom model configuration
LLM_JUDGE_MODEL="openai:gpt-4o-mini"            # Default judge model
EMBEDDING_MODEL="openai:text-embedding-3-small" # Default embedding model
```

## Getting Started

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up the database:**

   ```bash
   pnpm prisma migrate dev
   ```

3. **Start the development server:**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

4. **Start the background worker** (in a separate terminal):

   ```bash
   pnpm worker
   ```

   The worker processes background jobs like test runs using BullMQ and Redis.

## Available Scripts

| Command       | Description                          |
| ------------- | ------------------------------------ |
| `pnpm dev`    | Start the Next.js development server |
| `pnpm build`  | Build the application for production |
| `pnpm start`  | Start the production server          |
| `pnpm lint`   | Run ESLint                           |
| `pnpm worker` | Start the background job worker      |

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Docker Deployment

Make sure to update `compose/production/traefik/traefik.yml` with your domain and set the appropriate environment variables in `.env.local`.
Then run

```
docker compose -f production.yml up -d
```

The application will be available at the domain you configured in Traefik.

Make sure to run

```
pnpm prisma migrate deploy
```

in the app container to apply database migrations before starting the application.
