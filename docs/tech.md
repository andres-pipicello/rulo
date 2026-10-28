> **Superseded in part.** Moved verbatim from README.md; will be replaced by ADRs in the scaffold PR. Agreed changes not yet reflected below:
> - mise instead of asdf
> - lefthook pre-commit and CI both run `mise run check`
> - Temporal (+ `temporal-polyfill`) instead of @js-joda/core
> - fast-check for property-based tests; React Flow (+ elkjs) for graphs
> - Single package; `core/` is framework-free (readonly data + function modules, Zod only at the edges, `Result` for expected domain outcomes)

# Tech

## Project configuration
- use asdf for tool version management
- TypeScript: be strict and opinionated
- Core eslint stack + react + react-hooks + unused-imports
- Use Prettier only for formatting, never logic. Use eslint-config-prettier
- Use eslint-plugin-boundaries with path aliases
- Zod at every boundary
- react-error-boundary

## Preferred Stack and libraries
If a new library is needed, and only if needed, prefer the following stack and libraries:
- React + Vite + TypeScript
- TanStack Router
- TanStack Query
- Zod
- React Hook Form (+ Zod resolver)
- Tailwind + shadcn/ui (Radix) + lucide-react
- ESLint + Prettier (+ unused-imports, react-hooks)
- Vitest + Testing Library + MSW
- Playwright
- @js-joda/core for date/time handling

