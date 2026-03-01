# Dead Simple Task List

The Dead Simple Task List is a lightweight, share-by-link Kanban app for teams that want to collaborate instantly without account setup or onboarding friction.

Built during a **24 Hour Hackathon**, this project shipped as a complete full-stack product: frontend, API, backed, and deployment-ready architecture.

Live app: [https://deadsimpletasks.app/](https://deadsimpletasks.app/)

Contributors: Eli Parker, Canon Curtis, Emery Ingebretsen

## Why We Built This

Most task tools are powerful but heavy. For short-lived projects, hackathons, group assignments, or household planning, they can feel like overkill.

This app focuses on one thing:
- Create a board
- Share one link
- Start organizing immediately

No required account. No workspace setup. No extra ceremony.

## Hackathon Scope (24 Hours)

In one day, we built and integrated:
- A React web client with a clean Kanban experience
- A GraphQL API with Apollo Server
- A PostgreSQL-backed data model and SQL migrations
- Board persistence and ordering logic for columns/tasks
- Local "recent boards" UX so users can jump back in quickly

## Features

- Shareable board links for instant collaboration
- Kanban-style columns and tasks
- Task and column ordering support
- Recent boards saved in local storage
- GraphQL API designed for real-time friendly workflows

## Tech Stack

Frontend:
- React
- TypeScript
- Vite

Backend:
- Node.js
- Apollo Server (GraphQL)
- TypeScript

Data:
- PostgreSQL
- SQL migrations

## Project Structure

```text
apps/
  web/   # React + Vite frontend
  api/   # Apollo GraphQL API + Postgres migrations
docs/    # Product notes and design artifacts
```

## Running Locally

### 1) Start the API

```bash
cd apps/api
npm install
cp .env.example .env
npm run dev
```

Notes:
- API runs on `PORT=4000` by default.
- `DATABASE_ENABLED=false` works for local development without Postgres.
- Set `DATABASE_ENABLED=true` and `DATABASE_URL` to enable full persistence.

### 2) Start the Web App

```bash
cd apps/web
npm install
npm run dev
```

## Architecture Notes

- GraphQL schema and resolvers live under `apps/api/src/graphql`.
- Database migrations live in `apps/api/migrations` and run at API startup when DB is enabled.
- The frontend stores recently opened board metadata in local storage for quick return visits.

## Design Artifacts

- Concept mockup: `Task List Concept.png`
- API graph: `Task List API.png`

## What This Project Demonstrates

- End-to-end product execution under extreme time constraints
- Practical full-stack architecture decisions
- Delivery focus: solving a real collaboration pain point with minimal UX friction

## License

GPL 3 (see `LICENSE`)
