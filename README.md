# Smart Service Request & Workflow Management System

A responsive Angular web app for submitting service requests and tracking them from first report to closure. Requests move through a defined workflow, every change is recorded in a history timeline, and the list can be searched and filtered instantly.

**Tech stack:** Angular 21 · TypeScript · RxJS · Reactive Forms · RESTful API (json-server) · HTML5 · CSS3 · date-fns

## Features

- **Request list** with live search, filters (status, priority, category) and sorting. Clickable status tiles show counts and act as quick filters.
- **Reactive forms** for creating and editing requests, with field-level validation and clear error messages.
- **Workflow engine:** `New → In Review → In Progress → Resolved → Closed`. Only valid next steps are offered, and illegal jumps are rejected in the service layer too.
- **History timeline** on every request, with optional notes on each status change.
- **RxJS data layer:** a single `RequestService` keeps a `BehaviorSubject` store in sync with the REST API, so list and detail screens update without refetching. Searches are debounced and combined with the data stream using `combineLatest`.
- **Error handling:** an HTTP interceptor converts failures into readable messages, loads retry automatically, and the UI offers a Retry button.
- **Responsive layout** that works on phones, tablets and desktops.
- **Reusable components:** badge, error banner, and a `timeAgo` pipe built on date-fns.

## Getting started

```bash
npm install
npm run dev        # starts the REST API (port 3000) and the Angular app (port 4200)
```

Open http://localhost:4200.

Other scripts:

| Script | What it does |
|---|---|
| `npm start` | Angular dev server only |
| `npm run api` | json-server REST API only, serving `db.json` on port 3000 |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Production build into `dist/` |

> The project ships an `.npmrc` with `legacy-peer-deps=true`; this avoids a peer-dependency resolution error with the current npm.

## REST API

`db.json` seeds 12 realistic requests. json-server exposes standard REST routes:

| Method | Route | Purpose |
|---|---|---|
| GET | `/requests` | List all requests |
| GET | `/requests/:id` | One request |
| POST | `/requests` | Create |
| PATCH | `/requests/:id` | Update fields or status |
| DELETE | `/requests/:id` | Remove |

The API is a local mock backend for development and demos. The base URL lives in `src/app/config.ts`, so pointing the app at a real backend is a one-line change.

## Project structure

```
src/app/
  models/         types, workflow rules (STATUS_TRANSITIONS), pure filter/sort logic
  services/       RequestService (HttpClient + RxJS store)
  interceptors/   error interceptor
  shared/         badge, error banner, timeAgo pipe
  features/
    request-list/ search, filters, status tiles, card grid
    request-form/ create / edit with reactive forms
    request-detail/ details, workflow actions, history timeline
```

## Testing

`npm test` runs 15 unit tests covering the workflow rules, filter and sort logic, and the service (create, status change with history, illegal transitions, retry-then-error behaviour).
