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
- `src/app/sign-in` starts Google sign-in.
- `src/app/home` is the signed-in landing page.

Local UI state uses signals. HTTP uses RxJS.

## Talking to the API

The API origin is `http://localhost:5080`, in `src/app/core/api-origin.ts`.

Requests to that origin are sent with credentials. `POST`, `PUT`, `PATCH`, and `DELETE` also send `X-XSRF-TOKEN`, copied from the `XSRF-TOKEN` cookie.

Google sign-in is a browser navigation to `GET /api/auth/google`, not an HTTP call from Angular. After the callback, the API redirects back here. The route guards call `GET /api/auth/me` before they choose a page. Sign-out is `POST /api/auth/logout`.

The theme choice is stored in `localStorage` under `relovia-color-scheme`.

## Checks

`npm run lint`, `npm run format:check`, `npm test`, and `npm run build`. GitHub Actions runs those on pushes to `main` and on pull requests.
