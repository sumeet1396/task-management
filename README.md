# Task Management App

Local-first monorepo for a multi-tenant task management API (Week 1: database, migrations, seed data, and task endpoints).

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (for PostgreSQL)
- [Node.js](https://nodejs.org/) 20+
- [Yarn](https://yarnpkg.com/) 1.x

## Quick start

From the repository root:

```bash
docker compose up -d
```

Copy the API environment file and install dependencies:

```bash
cp apps/api/.env.example apps/api/.env
yarn --cwd apps/api install
```

Apply versioned SQL migrations (schema + development seed):

```bash
yarn --cwd apps/api migrate
```

Start the API:

```bash
yarn --cwd apps/api dev
```

The server listens on [http://127.0.0.1:4000](http://127.0.0.1:4000). In development, requests run as the seeded user from `DEV_USER_ID` in `apps/api/.env`.

### Health check

```bash
curl -s http://127.0.0.1:4000/health
```

### Create and list tasks (seeded org/project)

Organization, member, and project IDs come from `apps/api/migrations/002_dev_seed.sql`.

```bash
curl -s -X POST \
  http://127.0.0.1:4000/api/v1/organizations/11111111-1111-4111-8111-111111111111/projects/33333333-3333-4333-8333-333333333333/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"First task"}'

curl -s \
  http://127.0.0.1:4000/api/v1/organizations/11111111-1111-4111-8111-111111111111/projects/33333333-3333-4333-8333-333333333333/tasks
```

Invalid titles (empty or over 100 characters) return HTTP 400 with `error.code` `VALIDATION_ERROR`.

## Integration tests

PostgreSQL must be running (`docker compose up -d`). Tests use `DATABASE_URL` from `apps/api/.env`.

```bash
yarn --cwd apps/api test:integration
```

Tests cover successful task creation, validation failures, tenant isolation (403 for non-members), and PostgreSQL foreign-key constraints for cross-organization rows and non-member assignees.

## Repository layout

| Path                          | Purpose                              |
| ----------------------------- | ------------------------------------ |
| `docker-compose.yml`          | Local PostgreSQL 17 on port **5433** |
| `apps/api/migrations/`        | Versioned SQL migrations             |
| `apps/api/scripts/migrate.ts` | Applies pending migrations           |
| `apps/api/src/`               | Express API                          |
| `apps/web/`                   | Frontend (not required for Week 1)   |

## Development identity (local only)

When `NODE_ENV=development`, the API attaches the user in `DEV_USER_ID`. Optional header `X-Dev-User-Id` overrides that user for manual testing. This is not authentication and is disabled outside development.
