# Agent Instructions

## Runtime
- Use Node.js 18.16.1: run `nvm use 18.16.1` before any `node`, `npm`, or `pnpm` command.
- Use `pnpm`; the root manifest pins `packageManager` to `pnpm@9.1.2`.
- Keep work on the monorepo packages declared in `lerna.json` and `pnpm-workspace.yaml`: `packages/*` and `shared/*`.

## References
| Need | File |
|------|------|
| Product overview and external docs | `README.md` |
| Local setup and contribution flow | `CONTRIBUTING.md` |
| Environment variable defaults | `.env.example` |
| Local services | `docker-compose.yml` |
| Self-hosted production compose | `docker-compose.prod.yml` |
| Interactive self-hosted install/start/upgrade helper | `setup.sh` |
| Current feature plan | `specs/001-cash-vault-access/plan.md` |
| Spec Kit constitution | `.specify/memory/constitution.md` |

## Commands
| Task | Command |
|------|---------|
| Install dependencies | `pnpm install` |
| Start dev services | `docker compose up -d` |
| Build server and shared deps | `pnpm run build:server` |
| Run system migrations | `pnpm run system:migrate:latest` |
| Start server | `pnpm run server:start` |
| Start webapp | `pnpm run dev:webapp` |
| Build webapp and SDK deps | `pnpm run build:webapp` |
| Typecheck all packages | `pnpm run typecheck` |
| Run server tests | `pnpm --filter @bigcapital/server test` |
| Run server e2e tests | `pnpm --filter @bigcapital/server test:e2e` |
| Generate SDK types | `pnpm run generate:sdk-types` |
| Check formatting | `pnpm run format:check` |

## Environment And Docker
- Create local env files with `cp .env.example .env`; do not commit `.env`.
- Preserve existing env var names exactly, including `TENANT_DB_NAME_PERFIX`.
- Use `docker-compose.yml` for local MariaDB, Redis, and Gotenberg services.
- Use `setup.sh` and `docker-compose.prod.yml` only for self-hosted production flows; `setup.sh` archives and replaces `docker/`, `docker-compose.prod.yml`, and `.env.example` during upgrade/install.
- Keep production proxy routing in `docker/envoy/envoy.yaml`: `/api` goes to `server:3000`, `/` goes to `webapp:80`.

## Project Boundaries
- Backend code lives in `packages/server`; frontend code lives in `packages/webapp`.
- Shared packages live under `shared/`: `@bigcapital/utils`, `@bigcapital/email-components`, `@bigcapital/pdf-templates`, and `@bigcapital/sdk-ts`.
- Generate `@bigcapital/sdk-ts` from the server OpenAPI export; do not hand-edit generated API types.
- Read `.specify/memory/constitution.md` before Speckit spec, plan, task, or implementation work.
- For the active Cash Vault work, follow `specs/001-cash-vault-access/plan.md` and its linked design artifacts.
