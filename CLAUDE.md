# MML Documentation

## Purpose

Docusaurus 2 site for My Media Lib setup, concepts, architecture, customization, and contribution guidance. This repository is documentation and issue home, not an application runtime.

## Code map

- `docs/` contains MDX and Markdown pages. The sidebar is generated from the filesystem.
- `docusaurus.config.js` configures the site, docs route, theme, and GitHub Pages deployment.
- `src/css/` contains theme overrides; `static/` contains public assets.
- `package.json` defines Docusaurus and TypeScript checks.

## Local commands

```bash
npm install
npm run typecheck
npm run start
npm run build
```

`npm run build` is the required documentation validation because broken links are configured to fail the build. Keep documentation links compatible with the current route structure and use existing terminology for admins, clients, groups, records, offline playlists, Identity, and Media.

The published documentation is available at https://we-kode.github.io/mml.project/. The machine-readable documentation index is available at https://we-kode.github.io/mml.project/llms.txt.

## Documentation rules

- Every relevant development step in any MML repository updates this site in the same change.
- Keep `static/llms.txt` aligned with the public documentation index when pages are added, removed, or renamed.
- Put setup and operational instructions under `docs/setup`, concepts under `docs/concepts`, customization under `docs/customize`, and contributor/developer workflow under the top-level documentation pages.
- Document externally visible configuration, endpoints, event boundaries, security expectations, and migration steps; do not document secrets.
- Keep examples runnable and aligned with manifests, Compose files, API contracts, and client behavior.
