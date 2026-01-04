# AI Prompt & Response Log

This log captures the prompts given to the AI and the returned outputs for two passes:
1) Full-stack delivery for the minimal CRUD + auth app.
2) Workflow extraction so the app can be regenerated from a declarative plan.

## Prompt 1 — Full-stack delivery request
**Prompt:**  
“Using the attached minimal feature spec, propose a full-stack delivery for a tiny multi-user Projects + Notes app. Include: (a) schema, (b) REST API, (c) minimal browser UI, (d) automated tests, and (e) CI/deploy steps. Keep dependencies light (Node + vanilla JS are OK) and favor JSON file persistence for repeatability.”

**AI Output (summarized):**
- **Schema:** users `{id, email, passwordHash}`, projects `{id, ownerId, title, description}`, notes `{id, projectId, ownerId, body, status}`.
- **Auth:** `/api/register` and `/api/login` issuing bearer tokens; middleware checks `Authorization: Bearer <token>`.
- **CRUD:** `/api/projects` (list/create), `/api/projects/:id` (read/update/delete), `/api/projects/:id/notes` (list/create), `/api/projects/:id/notes/:noteId` (update/delete).
- **UI:** single-page HTML with login form, project list, inline forms to add projects and notes; fetch calls to the REST API; minimal state kept in memory per session token.
- **Tests:** happy-path auth + CRUD, authorization guard (cannot access others’ data), validation errors for empty fields; run via `npm test` using Node’s test runner.
- **CI/deploy:** npm install → lint → test; ship via simple Node process or container; recommends `npm run lint && npm test` as gate.

## Prompt 2 — Declarative workflow extraction
**Prompt:**  
“From that solution, extract a declarative workflow (JSON or YAML) that lists steps, dependencies, expected inputs/outputs, and the validation commands to run. Keep it small enough to regenerate the app from scratch.”

**AI Output (summarized):**
- Workflow stages: `design` (confirm spec), `scaffold` (create package.json, public assets, server entry), `api` (auth + CRUD handlers), `ui` (vanilla JS forms wired to API), `tests` (auth + CRUD coverage via Node test runner), `ci` (npm scripts for lint/test).
- Inputs: feature spec + chosen stack; Outputs: running server + passing tests.
- Validation commands: `npm run lint` (syntax check) and `npm test`.

## Prompt 3 — Tech swap request
**Prompt:**  
“Edit the workflow to swap the API layer from the built-in Node HTTP server to Express while keeping the rest of the constraints identical. Produce the updated workflow in YAML.”

**AI Output (summarized):**
- Reuses all stages but adjusts `api` step to scaffold an Express server, update routing in tests, and add `express` as a dependency.
- Validation commands unchanged: `npm run lint` and `npm test`.
