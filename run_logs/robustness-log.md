# Meta-layer Robustness Log

| Run | Stack | Workflow | Duration (approx) | Result | Notes |
| --- | ----- | -------- | ----------------- | ------ | ----- |
| Base | Node HTTP + vanilla JS + JSON file | `experiments/workflow.base.yaml` | ~8 min | ✅ Pass | No interventions beyond seed data reset between tests. |
| Swap | Express + vanilla JS + JSON file | `experiments/workflow.express.yaml` | ~10 min | ✅ Pass | Added Express-style router (vendored locally because npm registry blocked with 403); otherwise identical test suite. |

Both runs were executed from a clean folder containing only the feature spec and the selected workflow before regeneration. The same test suite (`npm test`) and syntax check (`npm run lint`) were used to validate parity.
