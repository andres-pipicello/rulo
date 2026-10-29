# Functional core: readonly data, function modules, errors as values

Domain code in `src/core/` models data as readonly plain objects and tagged unions (`kind` discriminant), with behaviour in function modules (`Amount.add(a, b)`) rather than classes. Plain data serialises to JSON as-is, matches what Zod parses, and crosses a future server boundary without (de)serialisation code. Zod schemas are the source of the types, but parsing happens only at the edges (seed data, APIs, URL params); core functions take already-valid values.

Expected domain outcomes (no Route found, a Route that cannot be quoted) are returned as a `Result` tagged union; broken invariants (mixing Currencies) throw, since they are bugs. UI and IO edges throw, because React error boundaries and TanStack Query expect thrown errors. ESLint enforces that `core` imports neither `api` nor the app, and that every `switch` over a union is exhaustive.

## Considered Options

- Classes with methods: familiar, but need construct-after-parse at every boundary and custom JSON handling.
- Effect: full functional runtime with its own schema library competing with Zod; too much to adopt up front.
- neverthrow: fine, but a ~30-line local `Result` is enough until chaining gets painful.
