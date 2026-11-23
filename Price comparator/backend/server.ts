import { configureNetwork } from "./network.ts";
import { collect, products, storeConfigs } from "./collector.ts";
import { readState } from "./storage.ts";
import { createAuth } from "./auth.ts";
import { openingStatus } from "./availability.ts";
import type { Observation, Store } from "./types.ts";

configureNetwork();

const MINUTE_MS = 60_000;
const REFRESH_COOLDOWN_MS = 15 * MINUTE_MS;
const STORE_FRESHNESS_MS = 48 * 60 * MINUTE_MS;

// Validate numeric environment settings before starting the server.
function readIntegerSetting(
  name: string,
  fallback: number,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const rawValue = Deno.env.get(name);
  const value = rawValue === undefined || rawValue.trim() === ""
    ? fallback
    : Number(rawValue);

  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(
      `${name} must be an integer between ${minimum} and ${maximum}`,
    );
  }

  return value;
}

const port = readIntegerSetting("PORT", 8000, 1, 65535);

const staleMinutes = readIntegerSetting(
  "STALE_AFTER_MINUTES",
  120,
  5,
);

const intervalMinutes = readIntegerSetting(
  "COLLECT_INTERVAL_MINUTES",
  60,
  15,
  Math.floor(2_147_483_647 / MINUTE_MS),
);

const origin = Deno.env.get("APP_ORIGIN") ||
  "http://localhost:5173";

const auth = createAuth({
  origin,
  clientId: Deno.env.get("GOOGLE_CLIENT_ID") || "",
  clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
  redirectUri: Deno.env.get("GOOGLE_REDIRECT_URI") ||
    `${origin}/api/auth/callback`,
});

// Validate store references once, before accepting requests.
const storesById = new Map<string, (typeof storeConfigs)[number]>();

for (const store of storeConfigs) {
  if (storesById.has(store.id)) {
    throw new Error(`Duplicate store ID: ${store.id}`);
  }

  storesById.set(store.id, store);
}

const productIds = new Set<string>();

for (const product of products) {
  if (productIds.has(product.id)) {
    throw new Error(`Duplicate product ID: ${product.id}`);
  }

  productIds.add(product.id);

  for (const source of product.sources) {
    if (!storesById.has(source.storeId)) {
      throw new Error(
        `Product ${product.id} references unknown store ${source.storeId}`,
      );
    }
  }
}

function json(
  data: unknown,
  status = 200,
  extraHeaders: HeadersInit = {},
): Response {
  const headers = new Headers(extraHeaders);

  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");

  return Response.json(data, { status, headers });
}

function methodNotAllowed(method: string): Response {
  return json(
    { message: "Method not allowed" },
    405,
    { Allow: method },
  );
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

// Missing, invalid, or future timestamps are not treated as recent.
function isRecent(
  value: string | null | undefined,
  maximumAge: number,
  now: number,
): boolean {
  const timestamp = parseTimestamp(value);

  return timestamp !== null &&
    timestamp <= now &&
    now - timestamp <= maximumAge;
}

function hasValidCoordinates(store: Store): boolean {
  const { latitude, longitude } = store;

  return typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
}

function getLocationAccuracy(store: Store): string {
  if (!hasValidCoordinates(store)) {
    return "unknown";
  }

  if (
    store.locationAccuracy === "published_map_point" ||
    store.locationAccuracy === "geocoded"
  ) {
    return store.locationAccuracy;
  }

  // Coordinates alone do not establish their origin or precision.
  return "unknown";
}

function isOfferExpired(
  validThrough: string | null,
  now: number,
): boolean {
  if (validThrough === null) return false;

  // Preserve the existing UTC convention for date-only values.
  const value = /^\d{4}-\d{2}-\d{2}$/.test(validThrough)
    ? `${validThrough}T23:59:59.999Z`
    : validThrough;

  const expiresAt = parseTimestamp(value);

  return expiresAt === null || expiresAt < now;
}

function getOpeningStatus(store: Store, state: Awaited<ReturnType<typeof readState>>, now: number) {
  if (!isRecent(store.checkedAt, STORE_FRESHNESS_MS, now)) {
    return "unknown";
  }

  try {
    return openingStatus(store, state.holidays, new Date(now));
  } catch (error) {
    console.error(
      `Could not calculate opening status for ${store.id}:`,
      error instanceof Error ? error.message : "Unknown error",
    );

    return "unknown";
  }
}

let refresh: Promise<void> | null = null;

function startRefresh(): void {
  if (refresh) return;

  refresh = Promise.resolve()
    .then(() => collect())
    .then(() => {})
    .catch((error) => {
      console.error(
        "Collection failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
    })
    .finally(() => {
      refresh = null;
    });
}

Deno.serve(
  {
    hostname: "127.0.0.1",
    port,
  },
  async (request) => {
    try {
      const authResponse = await auth.handle(request);

      if (authResponse) return authResponse;

      const { pathname } = new URL(request.url);

      const historyRoute = pathname.match(
        /^\/api\/products\/([^/]+)\/history$/,
      );

      const isRefreshRoute = pathname === "/api/refresh";

      const isReadRoute = pathname === "/api/products" ||
        pathname === "/api/stores" ||
        pathname === "/api/status" ||
        historyRoute !== null;

      if (!isRefreshRoute && !isReadRoute) {
        return json({ message: "Endpoint not found" }, 404);
      }

      const allowedMethod = isRefreshRoute ? "POST" : "GET";

      if (request.method !== allowedMethod) {
        return methodNotAllowed(allowedMethod);
      }

      if (isRefreshRoute) {
        if (!auth.session(request)) {
          return json({ message: "Sign in required" }, 401);
        }

        if (!auth.authorizedMutation(request)) {
          return json({ message: "Forbidden" }, 403);
        }

        if (refresh) {
          return json({ message: "Collection running" }, 202);
        }

        const state = await readState();

        // Another request may have started collection while reading.
        if (refresh) {
          return json({ message: "Collection running" }, 202);
        }

        const now = Date.now();
        const lastRun = parseTimestamp(state.lastRun);

        if (lastRun !== null) {
          const elapsed = Math.max(0, now - lastRun);
          const remaining = REFRESH_COOLDOWN_MS - elapsed;

          if (remaining > 0) {
            const retryAfterSeconds = Math.ceil(remaining / 1000);

            return json(
              {
                message: "Refresh cooldown",
                retryAfterSeconds,
              },
              429,
              { "Retry-After": String(retryAfterSeconds) },
            );
          }
        }

        startRefresh();

        return json({ message: "Collection started" }, 202);
      }

      let historyProductId: string | null = null;

      if (historyRoute) {
        try {
          historyProductId = decodeURIComponent(historyRoute[1]);
        } catch {
          return json({ message: "Invalid product ID" }, 400);
        }

        if (!productIds.has(historyProductId)) {
          return json({ message: "Product not found" }, 404);
        }
      }

      const state = await readState();
      const now = Date.now();

      if (pathname === "/api/status") {
        return json({
          refreshing: Boolean(refresh),
          lastRun: state.lastRun,
          sourceCount: storeConfigs.length,
          staleAfterMinutes: staleMinutes,
        });
      }

      if (pathname === "/api/stores") {
        return json(
          state.stores.map((store) => ({
            ...store,
            openingStatus: getOpeningStatus(store, state, now),
            locationAccuracy: getLocationAccuracy(store),
            pickupStock: "unknown",
          })),
        );
      }

      if (pathname === "/api/products") {
        return json(
          products.map((product) => {
            const offers = product.sources.map((source) => {
              const store = storesById.get(source.storeId);

              if (!store) {
                throw new Error(
                  `Unknown store: ${source.storeId}`,
                );
              }

              const records = state.observations.filter(
                (record) =>
                  record.productId === product.id &&
                  record.storeId === source.storeId,
              );

              // Storage preserves the order of collection attempts.
              const latest = records.at(-1);

              if (!latest) {
                return {
                  productId: product.id,
                  storeId: source.storeId,
                  store: store.name,
                  url: source.url,
                  price: null,
                  currency: "CLP",
                  stock: "unknown",
                  stockScope: "online",
                  quantity: null,
                  status: "pending",
                  stale: true,
                  recordedAt: null,
                  lastKnown: null,
                };
              }

              const lastGood = records.findLast(
                (record) => record.status === "ok",
              );

              const stale = !isRecent(
                latest.recordedAt,
                staleMinutes * MINUTE_MS,
                now,
              ) || isOfferExpired(latest.validThrough, now);

              return {
                ...latest,
                stale,
                lastKnown: latest.status === "error" && lastGood
                  ? {
                    price: lastGood.price,
                    recordedAt: lastGood.recordedAt,
                    currency: lastGood.currency,
                  }
                  : null,
              };
            });

            return {
              id: product.id,
              name: product.name,
              category: product.category,
              offers,
            };
          }),
        );
      }

      if (historyProductId !== null) {
        const records: Observation[] = state.observations.filter(
          (record) =>
            record.productId === historyProductId &&
            record.status === "ok",
        );

        return json(records);
      }

      return json({ message: "Endpoint not found" }, 404);
    } catch (error) {
      console.error(
        "Request failed:",
        error instanceof Error ? error.message : "Unknown error",
      );

      return json({ message: "Internal server error" }, 500);
    }
  },
);

// Refresh stored observations when necessary at startup.
const initialState = await readState();

if (
  !isRecent(
    initialState.lastRun,
    intervalMinutes * MINUTE_MS,
    Date.now(),
  )
) {
  startRefresh();
}

setInterval(startRefresh, intervalMinutes * MINUTE_MS);