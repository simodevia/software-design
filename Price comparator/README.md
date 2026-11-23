# Price Comparator

Price Comparator is a web application that compares computer component prices
across Chilean retailers. The initial catalog includes three categories:
RAM, graphics cards (GPUs), and processors (CPUs).

The application displays observed prices in Chilean pesos (CLP), online stock,
price history, and published store hours. Users can search by product name,
filter by category, and find offers from retailers with a nearby location.

## How it works

1. The backend queries the pages configured in `backend/catalog.json` and
   `backend/stores.json`. The initial catalog includes three sources per product.
2. The collector saves observations in `backend/data/state.json`. Each
   observation records the price, stock status, and observation date.
3. The frontend fetches this data from the API and displays it in product cards.
   It calculates the lowest available price using current offers with verified
   online stock.
4. When users open a product's price history, the application displays its
   recorded observations. The ability to identify trends depends on how many
   observations have been collected.
5. If users grant location permission, the browser estimates straight-line
   distances to stores with known coordinates. The selected radius applies
   when users enable the nearby retailer filter.

## Features

- **Price comparison:** Compare offers across retailers and see the lowest
  available price in CLP.
- **Price history:** View price observations by product and retailer.
- **Availability:** Check online stock, published opening hours, and store
  locations when the sources provide enough information.
- **Single sign-on (SSO):** Sign in with Google and use a session managed by the
  application. Anyone can browse the catalog. A valid session is required to
  trigger a manual data refresh.
- **Multiple languages:** Switch between English and Spanish using the local
  translation dictionary in `frontend/src/translations.js`.
- **Responsive design:** The header, filters, and cards adapt to different
  screen widths.

## Code structure

| File or directory | Responsibility |
| --- | --- |
| `frontend/src/main.jsx` | Starts React and loads the styles and language configuration. |
| `frontend/src/App.jsx` | Loads the catalog and stores. Manages search, filters, and location. |
| `frontend/src/components/` | Contains the sign-in controls, product cards, price history, and store selector. |
| `frontend/src/api.js` | Centralizes frontend requests to the API. |
| `frontend/src/geo.js` | Calculates the distance between the user's location and a store. |
| `backend/server.ts` | Handles API routes and coordinates collection. |
| `backend/auth.ts` | Verifies Google sign-in and manages application sessions. |
| `backend/collector.ts` and `backend/scraper.ts` | Query the configured sources and extract product and store data. |
| `backend/availability.ts` and `backend/storage.ts` | Calculate opening status and manage stored data, respectively. |

## Running locally

**Requirements:** A version of Node.js compatible with Vite 7, npm, and Deno.

From the repository root, open a terminal for the backend:

```powershell
cd backend
npm ci
```

Create `backend/.env` from `backend/.env.example` if it does not already exist.
Then start the backend:

```powershell
deno task start
```

In a second terminal, also starting from the repository root, start the frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/). Vite forwards `/api`
requests to the backend, which listens on port `8000`.

### Configuring Google sign-in

To enable SSO, create an OAuth client of type **Web application** and register
the following authorized redirect URI:

```text
http://localhost:5173/api/auth/callback
```

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env` and restart
the backend. Keep `.env` out of the repository. If both credentials are empty,
the catalog remains available with SSO disabled.

## Verification

From `backend`, run:

```powershell
deno task check
deno task test
```

From `frontend`, run:

```powershell
npm run build
```

**Local verification recorded on November 22, 2026:**

- The collector recorded nine offers across five retailers, with three sources
  for each of the three products in the catalog.
- Google sign-in was verified manually.
- The frontend production build completed successfully.
- The last documented test run showed 7 of 8 tests passing. The recommended
  correction was to change the expected logout response without an active
  session from HTTP 403 to HTTP 401. The result of a new run is still pending.

### Live demo walkthrough

1. Search for a product, select its category, and compare its offers.
2. Open its price history and explain what the observation dates represent.
3. Choose a store from the selector and review its opening hours.
4. Grant location permission, choose a radius, and apply the nearby retailer filter.
5. Switch languages, check the layout at a narrow screen width, and sign in with Google.

## Scope and limitations

Prices and stock reflect the time of collection. Check the final price,
payment conditions, and shipping details on the retailer's website. Online
stock and proximity to a retailer do not confirm in-store pickup. Store hours
and locations depend on the information available from each source.

## Weekly development log

| Week (Monday to Sunday) | Progress | Verification | Commit |
| --- | --- | --- | --- |
| November 16–22, 2026 | Offer collection, Google sign-in, and frontend build. | Nine offers recorded, successful Google sign-in, and a successful local build. | Add the actual commit link |
| [Next week] | [Change implemented] | [Test or evidence] | [Actual commit link] |

## Credits

- Academic project for the Software Design course.
- OpenAI ChatGPT was used to support code review, troubleshooting, and documentation.
- The project logo and generic component illustrations were generated with AI
  assistance. The Google sign-in graphic is from Google.
