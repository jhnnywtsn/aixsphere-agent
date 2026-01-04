# Meta-generation experiments

This folder holds the artifacts needed to recreate the “Projects & Notes” CRUD + auth app via AI prompting.

- `feature-spec.md` — minimal requirements (auth, projects, notes, validation, UI, tests, CI hints).
- `ai-prompts.md` — prompts and summarized AI responses for the full-stack delivery, workflow extraction, and tech swap.
- `workflow.base.yaml` — declarative workflow for the baseline stack (Node HTTP server + vanilla JS + JSON storage).
- `workflow.express.yaml` — workflow with the API layer swapped to an Express-style router.

## Regeneration runs
- **Base HTTP server**: generated in `runs/base-http/`. Validate with:
  - `npm run lint`
  - `npm test`
- **Express-style swap**: generated in `runs/express-swap/` using a lightweight Express-compatible shim to avoid registry downloads. Validate with the same commands as above.

The run summaries and timing notes live in `../run_logs/robustness-log.md`.
