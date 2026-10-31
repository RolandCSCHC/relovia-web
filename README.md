# relovia-web

I built the Relovia web app in Angular. It is the interface for a relocation planner: several moves, a checklist the person confirms into their own tasks, a budget, an inventory, private documents, a calendar, reminders, and, on an international move, homes and job applications. Sign-in, the database, and the files belong to `relovia-api`. This app never handles a Google access token, refresh token, or ID token.

The app is [relovia.rolandschlosser.dev](https://relovia.rolandschlosser.dev). The API is [api.relovia.rolandschlosser.dev](https://api.relovia.rolandschlosser.dev). Setup and local commands are in [docs/setup.md](docs/setup.md).

## Architecture

The app uses standalone components and is zoneless. Feature folders are the same vertical slices as the API: `sign-in`, `home`, `relocations`, `budget`, `inventory`, `documents`, `calendar`, `housing`, `applications`, `notifications`, and `export`. Screen state stays on the component that shows it, in signals: which row is open, whether a save is in flight, and the draft being edited. HTTP stays on RxJS, through Angular's `HttpClient`. The session is the piece routes share. The unread count in the top bar comes from `NotificationInbox`, which loads reminders with a `resource` once someone is signed in.

`src/app/core` holds the API origin, a functional HTTP interceptor, the session, functional route guards, and the theme. The session calls `GET /api/auth/me` once and shares that result. The guards wait for it, and a signed-out visitor goes to the sign-in page. Sign-in is a browser navigation to `GET /api/auth/google`, so the Google handshake never enters this app. After the callback, the API redirects back here with the session cookie already set. Sign-out is `POST /api/auth/logout`.

Requests to the API origin are sent with credentials. `POST`, `PUT`, `PATCH`, and `DELETE` also send `X-XSRF-TOKEN`, copied from the `XSRF-TOKEN` cookie, which is the name the API's antiforgery middleware expects. The session cookie itself is host-only and `SameSite=Lax`. The site and the API are `relovia.rolandschlosser.dev` and `api.relovia.rolandschlosser.dev`, so the browser treats the call as same-site and sends the cookie. Locally, port 4200 calling port 5080 is the same arrangement.

The HTTP contract is generated, then hidden behind a facade. `openapi/relovia.json` is the API's OpenAPI document, and `npm run api:generate` writes a typed Angular client with `@hey-api/openapi-ts`. Screens call `ReloviaClient`, which uses that client, maps a failure to one `ApiError` with a status and field messages, and leaves the generated folder out of ESLint. The base URL is the API origin from `src/environments`, so production does not call the localhost server written in the document. The generated client uses `HttpClient`, so the credentialed interceptor still runs.

One relocation is a shell route with child routes for its tabs. The shell shows the name, the route, and the actions that apply to the whole move: download the PDF, edit, and delete. The tabs are tasks, inventory, budget, documents, calendar, and a summary. Housing and applications join the bar when the move is international. Feature pages do not repeat the title. The checklist is its own page, before those tasks exist: the API returns a suggestion, the person selects, deselects, and edits lines, and confirm is the call that writes them.

Rules the screens share live in plain functions next to the feature, with their own tests. Money formatting, dates, which files may be chosen, and the checklist draft are examples. The budget shows the API's converted amounts and formats a price as the currency code plus `$`, so `CLP $30,944,444` and `NZD $1,200.00` stay distinct. An amount with no exchange rate stays on screen and is left out of the total.

The look is the Evergreen palette: sand surfaces, forest green, and gold, set as explicit light and dark Material system colors in `src/styles.scss`. The theme is a signal, stored in `localStorage` under `relovia-color-scheme`. An effect writes `color-scheme` on the document. Layout uses the spacing tokens in that file (`--space-1` through `--space-8`, `--page-max`). The shell is the top bar and a centered column.

Vitest covers the guards, the client wrapper, and those plain rules. GitHub Actions runs lint, Prettier, the tests, and the production build on pushes to `main` and on pull requests. The production build is static and is hosted on Vercel.

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

## Screens

- `src/app/core` holds the API origin, the credentialed HTTP interceptor, the session, the route guards, and the theme.
- `src/app/api` holds the generated client and `ReloviaClient`, the wrapper the screens call.
- `src/app/sign-in` starts Google sign-in.
- `src/app/home` lists relocations and their progress.
- `src/app/relocations` edits a relocation, reviews its checklist, and lists its tasks. A task can carry a description, a link, and a position. Move earlier and move later swap that position with a neighbor.
- `src/app/budget` sets the budget currency and an optional monthly net income, manages categories and estimates, compares them with spending, and records estimates and expenses in any currency. Totals use the API's converted amounts.
- `src/app/inventory` lists belongings by room. Each item is owned or still to purchase, and can be marked bring, sell, donate, store, or discard. Packing is tracked when the item is being brought. A price on something still to buy counts in a budget category. Start from a list reviews a furnished or unfurnished shopping list and adds the items the person keeps.
- `src/app/documents` keeps a relocation's private files. Add document takes a PDF, JPEG, PNG, or WebP up to 10 MB, plus a category, an expiration date, and the tasks that file supports.
- `src/app/calendar` shows one month. Milestones are dates, appointments have a time, and task due dates appear on the same grid. Add, edit, and delete apply to the events.
- `src/app/housing` compares homes typed in for an international move. Rent and deposit stay in the currency they were entered in. When monthly net income is set, a home with rent shows that rent as a percentage of income. One home can be chosen, and choosing it leaves the budget as it is.
- `src/app/applications` tracks job applications typed in for an international move. A next date stays on the application.
- `src/app/notifications` lists in-app reminders and the preference for channel and lead time. The top bar shows how many are unread.
- `src/app/export` is the summary: the date and status, progress, open tasks, money totals, what is still to pack, and the dates. Download Summary on that page is the short PDF. Download PDF on the shell is the full packet.

## API client

`openapi/relovia.json` is the OpenAPI document. `npm run api:generate` writes the Angular client to `src/app/api/generated`. That folder is generated output, so ESLint does not check it. The client uses `HttpClient`, so the credentialed interceptor still applies. Its base URL is the API origin from `src/environments`, not the localhost server written in the document.

Refresh the document from a running Development API, then regenerate:

```bash
curl -fsS http://localhost:5080/openapi/v1.json -o openapi/relovia.json
npm run api:generate
```

## Checks

`npm run lint`, `npm run format:check`, `npm test`, and `npm run build`. GitHub Actions runs those on pushes to `main` and on pull requests.
