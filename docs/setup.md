# Setup

## Prerequisites

- Node.js 24.21.0. This repository pins it in `.node-version`. Use a version manager that reads that file, and leave the global Node version unchanged when other projects need an older one.
- npm 11.19.0. After `corepack enable`, npm follows the `packageManager` field in `package.json`.
- `relovia-api` running at `http://localhost:5080`, with Postgres and Google credentials if you want to sign in. That repository's setup is in its `docs/setup.md`.

## Install and run

```bash
corepack enable
npm ci
npm start
```

Open `http://localhost:4200/`. The dev server reloads when files change.

Without a session, the app stays on the sign-in page. With a session, it opens the home page and shows the signed-in name.

## Scripts

| Script                 | What it does                                                                   |
| ---------------------- | ------------------------------------------------------------------------------ |
| `npm start`            | Development server on port 4200                                                |
| `npm test`             | Vitest. In CI the run exits. Locally, pass `-- --watch=false` for a single run |
| `npm run lint`         | ESLint on `src`                                                                |
| `npm run format`       | Prettier, writing changes                                                      |
| `npm run format:check` | Prettier, failing when a file differs                                          |
| `npm run build`        | Production build in `dist/`                                                    |
| `npm run api:generate` | Regenerates `src/app/api/generated` from `openapi/relovia.json`                |

## Configuration

`src/environments/environment.ts` points local development at `http://localhost:5080`. The production build replaces that file and uses `https://api.relovia.app`. The API must allow `http://localhost:4200` in `Web:Origins`. The API's Development settings already do.

## Production

Vercel serves the production build at `https://relovia.app`. The build command is `npm run build` and the output directory is `dist/relovia/browser`. There are no Vercel environment variables. The API origin is compiled in from `src/environments/environment.production.ts`.

## CI

GitHub Actions installs the Node version from `.node-version`, then runs lint, the format check, the tests, and the production build.
