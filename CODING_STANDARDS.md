# Coding Standards

Judgement-call rules, applied during code review. Mechanical rules belong in automated checks; those marked _(→ ESLint)_ move there when the project is scaffolded.

- Type everything precisely; use `unknown` plus narrowing where a type is not yet known. _(→ ESLint: `no-explicit-any`)_
- Call `fetch` only inside `api/`. _(→ ESLint: `no-restricted-globals` + boundaries)_
- Validate all external data with Zod at the boundary where it enters.
- Fetch data through TanStack Query rather than manual fetch-and-state code.
- Cover every new API client with tests.
