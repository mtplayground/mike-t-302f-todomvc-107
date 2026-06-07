# todomvc-030

## Snapshot

todomvc-030 is a full-stack TodoMVC-style app built as a TypeScript monorepo. It provides a React single-page todo list backed by an Express API and PostgreSQL persistence through Prisma.

## What It Does

- Add a todo from a single text input.
- Render the persisted todo list.
- Check or uncheck todos to mark them complete or active.
- Delete todos from the list.
- Reload the page and preserve todo state from PostgreSQL.
- Show basic API availability in the UI.

## Architecture

- Root workspace manages `client` and `server` npm workspaces.
- `client` is a Vite React app using Tailwind CSS and TanStack React Query.
- `server` is an Express API using centralized error handling and Zod request validation.
- PostgreSQL is the only durable store. Prisma owns database access and migrations.
- The primary todo data model is `todos`: UUID id, title, completed flag, and created/updated timestamps.
- The Express server serves API routes and, after `npm run build`, serves the built React app from `client/dist`.
- The repository still contains older task/image API and component code, but the current product flow is the todo list wired to `/todos`.

## API Surface

- `GET /health` returns API health.
- `GET /todos` lists todos.
- `POST /todos` creates a todo with a non-empty title.
- `PATCH /todos/:id` toggles a todo by accepting a `completed` boolean.
- `DELETE /todos/:id` deletes a todo.

## Conventions

- Runtime configuration comes from environment variables; `DATABASE_URL` must be PostgreSQL.
- Server listens on `0.0.0.0:8080` by default.
- Root scripts are the primary entry points:
  - `npm run build`
  - `npm test`
  - `npm run test:e2e`
  - `npm start`
- `npm start` runs Prisma migrations before starting the built server.

## Test Coverage

- Backend service tests cover todo persistence behavior.
- Backend route tests cover todo CRUD, validation errors, and not-found responses.
- Client tests cover adding, toggling, deleting, and validation behavior in the todo UI.
- Playwright E2E covers the full todo flow: add, complete, reload for persistence, and delete.
