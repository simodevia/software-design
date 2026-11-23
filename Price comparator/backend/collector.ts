import type { Product, State, StoreConfig } from "./types.ts";
import { scrapeOffer, scrapeStore } from "./scraper.ts";
import { fetchText } from "./http.ts";
import { acquireLock, readState, saveState } from "./storage.ts";
export const products: Product[] = JSON.parse(
  await Deno.readTextFile(new URL("./catalog.json", import.meta.url)),
);
export const storeConfigs: StoreConfig[] = JSON.parse(
  await Deno.readTextFile(new URL("./stores.json", import.meta.url)),
);
let running: Promise<State> | null = null;

export function collect(): Promise<State> {
  if (running) return running;
  running = runCollection().finally(() => {
    running = null;
  });
  return running;
}

async function runCollection(): Promise<State> {
  const release = await acquireLock();
  try {
    const state = await readState();
    const now = new Date();
    const year = Number(
      new Intl.DateTimeFormat("en", {
        timeZone: "America/Santiago",
        year: "numeric",
      }).format(now),
    );
    if (
      !state.holidays || state.holidays.year !== year ||
      now.getTime() - Date.parse(state.holidays.checkedAt) > 7 * 86400000
    ) {
      try {
        const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/CL`;
        const rows = JSON.parse((await fetchText(url, 200000)).text);
        if (
          !Array.isArray(rows) || !rows.length ||
          rows.some((row) => !/^\d{4}-\d{2}-\d{2}$/.test(row.date))
        ) throw new Error("Invalid holiday feed");
        state.holidays = {
          year,
          dates: rows.filter((row) => row.global !== false).map((row) =>
            row.date
          ),
          source: url,
          checkedAt: now.toISOString(),
        };
      } catch {
        /* Existing calendar remains dated. UI marks unavailable calendars as unknown. */
      }
    }
    // Requests to each retailer are sequential and run only once per collection interval.
    const stores = [];
    for (const store of storeConfigs) {
      stores.push(
        await scrapeStore(
          store,
          state.stores.find((entry) => entry.id === store.id),
        ),
      );
      for (const product of products) {
        for (
          const source of product.sources.filter((entry) =>
            entry.storeId === store.id
          )
        ) {
          state.observations.push(await scrapeOffer(product, source, store));
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
    state.stores = stores;
    state.lastRun = new Date().toISOString();
    await saveState(state);
    return state;
  } finally {
    await release();
  }
}
