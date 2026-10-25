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
- `src/app/api` holds the generated client and the small wrapper the screens call.
- `src/app/sign-in` is the welcome page. It says the app is a work in progress and starts Google sign-in, which also tells the developer you are interested.
- `src/app/early-access` thanks signed-in people who do not have access yet. `GET /api/auth/me` returns `hasAccess`, and `authGuard` sends everyone without it here.
- `src/app/home` lists relocations and their progress.
- `src/app/relocations` edits a relocation, reviews its checklist, and lists its tasks.
- `src/app/budget` sets the budget currency, manages categories and estimates, compares them with spending, and records estimates and expenses in any currency. Totals are shown in the budget currency using the API's converted amounts, and amounts are formatted as the currency code plus `$` (`CLP $30,944,444`, `NZD $1,200.00`).
- `src/app/calendar` shows one month for a relocation. Milestones are dates, appointments have a time, and task due dates appear on the same grid without becoming events. Add, edit, and delete apply only to the events.
- `src/app/notifications` lists in-app reminders and the preference for channel and lead time. The top bar links here once someone is signed in, and shows how many reminders are unread.
- `src/app/documents` keeps a relocation's private files. Add document opens a dialog for a PDF, JPEG, PNG, or WebP up to 10 MB, plus a category, an expiration date, and the tasks that file supports. Download and delete stay on this relocation.
- `src/app/export` is the summary of one relocation: the route and date, progress, open tasks, money totals, what is still to pack, and the dates. Download PDF on that page is the summary. Download PDF on the relocation is the full packet.
- `src/app/inventory` lists a relocation's belongings by room. Room and category come from fixed lists. Each item is owned or still to purchase, can be marked bring, sell, donate, store, or discard, and tracks packing only when it is being brought. A price on something still to buy is counted in a budget category (Furnishing by default). Prices stay in the currency they were entered in. Owned items are not a new cost. Start from a list to review a furnished or unfurnished shopping list, for every room or one room, and add the items you keep. Items already on the list are left out. Prices are added afterwards.

Local UI state uses signals. HTTP uses RxJS.

## Talking to the API

Locally the API origin is `http://localhost:5080`. The production build, served at `https://relovia.rolandschlosser.dev`, uses `https://api.relovia.rolandschlosser.dev`. Both come from `src/environments`.

Requests to that origin are sent with credentials. `POST`, `PUT`, `PATCH`, and `DELETE` also send `X-XSRF-TOKEN`, copied from the `XSRF-TOKEN` cookie.

Google sign-in is a browser navigation to `GET /api/auth/google`, not an HTTP call from Angular. After the callback, the API redirects back here. The route guards call `GET /api/auth/me` before they choose a page. Sign-out is `POST /api/auth/logout`.

The theme choice is stored in `localStorage` under `relovia-color-scheme`. Page layout uses the spacing tokens in `src/styles.scss` (`--space-1` through `--space-8`, `--page-max`) and the `.page-title` and `.page-lead` classes. The shell is the top bar and the centered page column. The Evergreen palette is a set of explicit light and dark Material system colors in `src/styles.scss`; `.chip` is the small label.

## API client

`openapi/relovia.json` is the OpenAPI document. `npm run api:generate` writes the Angular client to `src/app/api/generated`. That folder is generated output, so ESLint does not check it. The client uses `HttpClient`, so the credentialed interceptor still applies. Its base URL is the API origin from `src/environments`, not the localhost server written in the document.

Refresh the document from a running Development API, then regenerate:

```bash
curl -fsS http://localhost:5080/openapi/v1.json -o openapi/relovia.json
npm run api:generate
```

## Checks

`npm run lint`, `npm run format:check`, `npm test`, and `npm run build`. GitHub Actions runs those on pushes to `main` and on pull requests.
