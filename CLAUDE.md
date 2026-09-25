# RTE — Cold-Chain Intelligence (Person 2 frontend)

Read [plan.md](plan.md) at the start of every session: segment-by-segment build plan, progress checkboxes, confirmed decisions, skills to use, open items.

- Spec: [docs/PERSON_2_FRONTEND_INTELLIGENCE.md](docs/PERSON_2_FRONTEND_INTELLIGENCE.md)
- Design system: [docs/DESIGN.md](docs/DESIGN.md) (prose sections win over the YAML front-matter)
- System pipeline & ownership: [docs/PIPELINE.md](docs/PIPELINE.md)
- Person 1's scope — do NOT build any of it: [docs/PERSON_1_COMMAND_CENTER.md](docs/PERSON_1_COMMAND_CENTER.md)
- Visual references: [example/](example/)

Rules:
- Build what the spec lists plus only the extras approved in plan.md "Decisions". Nothing else.
- Every visual choice must follow DESIGN.md.
- The frontend only visualizes backend results; never compute official ML/optimization values in React. Mock data lives only in `src/mocks/`.
- Work one segment at a time; tick its box in plan.md only after it is verified in the browser.
- Do not use the `routeyai-*` skills here — they belong to another project.
