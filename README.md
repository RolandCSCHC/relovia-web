# relovia-web

Angular app for Relovia. Sign-in goes through `relovia-api`. This app never handles a Google access token, refresh token, or ID token.

Setup and local commands are in [docs/setup.md](docs/setup.md).

## Stack

| Piece           | Choice                                        |
| --------------- | --------------------------------------------- |
| Framework       | Angular 22.2, standalone components, zoneless |
| UI              | Angular Material 22.2, light and dark         |
| Language        | TypeScript 6, RxJS 7                          |
| Styles          | SCSS                                          |
| Tests           | Vitest                                        |
| Lint and format | ESLint, Prettier                              |
| Node.js         | 24.21.0, pinned in `.node-version`            |
| npm             | 11.19.0, pinned by `packageManager`           |

## Shape

Feature folders, and no global state library.

- `src/app/core` holds the API origin, the credentialed HTTP interceptor, the session, the route guards, and the theme.
- `src/app/api` holds the generated Phase 1 client and the small wrapper the screens call.
- `src/app/sign-in` starts Google sign-in.
- `src/app/home` lists relocations and their progress.
- `src/app/relocations` edits a relocation, reviews its checklist, and lists its tasks.

Local UI state uses signals. HTTP uses RxJS.

## Talking to the API

Locally the API origin is `http://localhost:5080`. The production build, served at `https://relovia.app`, uses `https://api.relovia.app`. Both come from `src/environments`.

Requests to that origin are sent with credentials. `POST`, `PUT`, `PATCH`, and `DELETE` also send `X-XSRF-TOKEN`, copied from the `XSRF-TOKEN` cookie.

Google sign-in is a browser navigation to `GET /api/auth/google`, not an HTTP call from Angular. After the callback, the API redirects back here. The route guards call `GET /api/auth/me` before they choose a page. Sign-out is `POST /api/auth/logout`.

The theme choice is stored in `localStorage` under `relovia-color-scheme`. Page layout uses the spacing tokens in `src/styles.scss` (`--space-1` through `--space-8`, `--page-max`) and the `.page-title` and `.page-lead` classes. The shell is the top bar and the centered page column.

## API client

`openapi/relovia.json` is the Phase 1 OpenAPI document. `npm run api:generate` writes the Angular client to `src/app/api/generated`. That folder is generated output, so ESLint does not check it. The client uses `HttpClient`, so the credentialed interceptor still applies. Its base URL is the API origin from `src/environments`, not the localhost server written in the document.

Refresh the document from a running Development API, then regenerate:

```bash
curl -fsS http://localhost:5080/openapi/v1.json -o openapi/relovia.json
npm run api:generate
```

## Checks

`npm run lint`, `npm run format:check`, `npm test`, and `npm run build`. GitHub Actions runs those on pushes to `main` and on pull requests.
