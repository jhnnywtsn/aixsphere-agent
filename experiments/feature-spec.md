# Minimal CRUD + Auth Feature Spec

## Problem
Deliver a small “Projects and Notes” app that supports multi-user access with basic authentication and CRUD operations. The goal is to keep the surface area small enough for repeatable generation, while still touching back-end, front-end, and CI hooks.

## Functional Requirements
- Users can register with email + password and then log in.
- Authenticated users receive a bearer token and must include it on API requests.
- Each user can create, read, update, and delete their own projects.
- Each project has a title and optional description.
- Each project can contain multiple notes with a body and optional status (open/closed).
- Users can list all projects with their nested notes.
- Validation: title and note body are required; disallow empty strings.
- Unauthorized access should return HTTP 401 and never leak other users’ data.

## Non-Functional Requirements
- Provide a simple JSON-based persistence layer to keep the stack lightweight for quick regeneration.
- Include a minimal browser UI: login form, create project form, list view with inline note creation and deletion.
- Include automated tests for auth and CRUD flows.
- Provide a CI/deploy outline suitable for a trivial hobby deployment (e.g., Node + npm scripts).

## Deliverables to Request from the AI
- Data/schema description for users, projects, and notes.
- API contract (auth + CRUD endpoints) including sample payloads and responses.
- UI sketch (screens/components, state flow).
- Test plan plus concrete commands to run them.
- CI/deploy checklist referencing the commands from the test plan.
