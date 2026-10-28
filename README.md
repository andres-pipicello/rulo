# Project

`rulo` is a project to view and discover the best way of moving money across platforms.
It shows and calculates the best routes to move money between different cryptocurrencies and platforms.

# Docs

- [Specification](docs/spec.md)
- [Glossary](GLOSSARY.md)
- [Domain model (draft)](docs/domain-model.md)
- [Decisions](docs/adr/)

# Development

Requires [mise](https://mise.jdx.dev).

```sh
mise install          # node, pnpm, lefthook
mise run install      # dependencies
lefthook install      # pre-commit hook: mise run check
mise run dev          # http://localhost:5173
```

Other tasks: `mise tasks`.
