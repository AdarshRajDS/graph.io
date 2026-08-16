# Agent instructions

Read `docs/architecture.md`, `docs/implementation-plan.md`, and `docs/development-plan.md` before editing anything.

- Follow `docs/architecture.md`.
- Keep real-time visualization inside `apps/web`.
- Keep Manim execution inside `services/renderer`.
- Never execute arbitrary user-supplied Python.
- Validate all visualization specifications at every service boundary.
- Never build shell commands through string concatenation. Never use `shell=True`.
- Add or update tests with every behavior change.
- Run relevant lint, type-check, and test commands before declaring a task complete.
- Work on one implementation phase at a time.
- Do not replace working infrastructure without documenting the reason.
- Do not implement later phases while the current phase is in progress.
