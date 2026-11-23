import { parseHTML } from "linkedom";
import { fetchPage, fetchText } from "./http.ts";
import type {
  Hours,
  Observation,
  Product,
  Source,
  Stock,
  Store,
  StoreConfig,
} from "./types.ts";

type Json = Record<string, any>;
const compact = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

export function extractProducts(html: string): Json[] {
  const { document } = parseHTML(html);
  const products: Json[] = [];
  function visit(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const object = value as Json;
    const types = Array.isArray(object["@type"])
      ? object["@type"]
      : [object["@type"]];
    if (types.includes("Product")) products.push(object);
    if (object["@graph"]) visit(object["@graph"]);
    if (object.mainEntity) visit(object.mainEntity);
  }
  for (
    const script of document.querySelectorAll(
      'script[type="application/ld+json"]',
    )
  ) {
    try {
      visit(JSON.parse(script.textContent || ""));
    } catch { /* Ignore unrelated malformed metadata. */ }
  }
  return products;
}

function matchesIdentity(text: string, tokens: string[]): boolean {
  const normalized = compact(text);
  return tokens.every((token) => normalized.includes(compact(token)));
}

export function parseProduct(
  html: string,
  source: Source,
): Pick<
  Observation,
  "price" | "currency" | "stock" | "quantity" | "validThrough"
> {
  const { document } = parseHTML(html);
  const meta = (property: string) =>
    document.querySelector(`meta[property="${property}"]`)?.getAttribute(
      "content",
    );
  if (source.storeId === "winpy") {
    const identity = meta("product:retailer_item_id") || "";
    if (!matchesIdentity(identity, source.identity)) {
      throw new Error("Product identity mismatch");
    }
    const price = Number(meta("product:price:amount"));
    const currency = meta("product:price:currency") || "";
    if (!Number.isFinite(price) || price <= 0 || currency !== "CLP") {
      throw new Error("Invalid price or currency");
    }
    const stock = parseStock(meta("product:availability") || "");
    const quantityMatch = document.querySelector("#stock-product h3")
      ?.textContent?.match(/(\d+)\s+unidades/i);
    return {
      price,
      currency,
      stock,
      quantity: quantityMatch ? Number(quantityMatch[1]) : null,
      validThrough: null,
    };
  }

  const expectedPath = new URL(source.url).pathname.replace(/\/$/, "");
  const candidates = extractProducts(html).filter((product) => {
    const identityText = [
      product.name,
      product.mpn,
      product.sku,
      product.description,
    ].join(" ");
    const url = product.url || product.offers?.url || product.offers?.[0]?.url;
    if (
      url &&
      new URL(url, source.url).pathname.replace(/\/$/, "") !== expectedPath
    ) return false;
    return matchesIdentity(identityText, source.identity);
  });
  if (candidates.length !== 1) {
    throw new Error("Product identity missing or ambiguous");
  }
  const product = candidates[0];
  const offers = Array.isArray(product.offers)
    ? product.offers
    : [product.offers];
  const offer = offers.find((value: Json) => value?.["@type"] === "Offer");
  if (!offer) throw new Error("Product offer not found");
  const specifications = Array.isArray(offer.priceSpecification)
    ? offer.priceSpecification
    : [offer.priceSpecification];
  const specification = specifications.find((value: Json) =>
    value && value.priceType !== "https://schema.org/ListPrice"
  );
  const price = Number(offer.price ?? specification?.price);
  const currency = offer.priceCurrency || specification?.priceCurrency;
  if (!Number.isFinite(price) || price <= 0 || currency !== "CLP") {
    throw new Error("Invalid price or currency");
  }
  let stock = parseStock(offer.availability || "");
  const visibleStock =
    document.querySelector(".summary .stock, .entry-summary .stock")
      ?.textContent?.toLowerCase() || "";
  if (
    /agotado|sin stock|out of stock/.test(visibleStock) && stock === "in_stock"
  ) stock = "unknown";
  const quantity = Number(offer.inventoryLevel?.value);
  return {
    price,
    currency,
    stock,
    quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : null,
    validThrough: offer.priceValidUntil || specification?.validThrough || null,
  };
}

export function parseStock(value: string): Stock {
  const stock = value.toLowerCase().split("/").pop();
  if (["instock", "in_stock", "limitedavailability"].includes(stock || "")) {
    return "in_stock";
  }
  if (
    ["outofstock", "out_of_stock", "soldout", "discontinued"].includes(
      stock || "",
    )
  ) return "out_of_stock";
  if (["preorder", "presale", "backorder"].includes(stock || "")) {
    return "preorder";
  }
  return "unknown";
}

export async function scrapeOffer(
  product: Product,
  source: Source,
  store: StoreConfig,
): Promise<Observation> {
  const base = {
    productId: product.id,
    storeId: store.id,
    store: store.name,
    url: source.url,
    recordedAt: new Date().toISOString(),
    stockScope: "online" as const,
    priceBasis: "published" as const,
  };
  try {
    const html = await fetchPage(source.url);
    return {
      ...base,
      ...parseProduct(html, source),
      status: "ok",
      error: null,
    };
  } catch (error) {
    return {
      ...base,
      price: null,
      currency: "CLP",
      stock: "unknown",
      quantity: null,
      validThrough: null,
      status: "error",
      error: error instanceof Error ? error.message : "Scraper failed",
    };
  }
}

export function parseContact(html: string, config: StoreConfig): Store {
  const { document } = parseHTML(html);
  for (const element of document.querySelectorAll("script,style,noscript")) {
    element.remove();
  }
  const text = (document.body?.textContent || "").replace(/\s+/g, " ").trim();
  let address: string | null = null;
  let hours: Hours | null = null;
  let hoursText: string | null = null;
  let closedOnHolidays = false;
  const weekdayHours = (days: number[], opens: string, closes: string) =>
    Object.fromEntries(
      days.map((day) => [String(day), [[opens, closes]]]),
    ) as Hours;
  if (config.id === "centralgamer") {
    address =
      text.match(/Antonio Varas\s*#?\s*303[^.]*Providencia(?:, Santiago)?/i)
        ?.[0] || null;
    const match = text.match(
      /Lunes a Jueves de (\d{1,2}:\d{2}) a (\d{1,2}:\d{2}) Hrs\. Viernes de (\d{1,2}:\d{2}) a (\d{1,2}:\d{2}) Hrs\. S[áa]bados de (\d{1,2}:\d{2}) a (\d{1,2}:\d{2}) Hrs\. Domingos y Festivos cerrados/i,
    );
    if (match) {
      hours = {
        ...weekdayHours([1, 2, 3, 4], match[1], match[2]),
        "5": [[match[3], match[4]]],
        "6": [[match[5], match[6]]],
        "0": [],
      };
      hoursText = match[0];
      closedOnHolidays = true;
    }
  } else if (config.id === "tectec") {
    address = text.match(
      /General Holley\s+2335,\s*Local\s*0101A,\s*Nivel\s*-1,\s*Providencia,\s*Santiago/i,
    )?.[0] || null;
    const match = text.match(
      /Horarios de Atenci[óo]n:\s*Lun a Jue (\d{1,2}:\d{2}) a (\d{1,2}:\d{2}) hrs\. Vie (\d{1,2}:\d{2}) a (\d{1,2}:\d{2})/i,
    );
    if (match) {
      hours = {
        ...weekdayHours([1, 2, 3, 4], match[1], match[2]),
        "5": [[match[3], match[4]]],
      };
      hoursText = match[0];
    }
    // Weekends and holiday exceptions remain unknown when the page omits them.
  } else if (config.id === "myshop") {
    address =
      text.match(/General del Canto\s+135,\s*Providencia\s*-\s*Stgo/i)?.[0] ||
      null;
    const match = text.match(
      /Atenci[óo]n en tienda y telef[óo]nica de:\s*Lunes a Jueves de (\d{1,2}):(\d{2}) a (\d{1,2}):(\d{2}) hrs\.? Viernes de (\d{1,2}) a (\d{1,2}) hrs/i,
    );
    if (match) {
      hours = {
        ...weekdayHours(
          [1, 2, 3, 4],
          `${match[1]}:${match[2]}`,
          `${match[3]}:${match[4]}`,
        ),
        "5": [[`${match[5]}:00`, `${match[6]}:00`]],
      };
      hoursText = match[0];
    }
  } else if (config.id === "winpy") {
    address = text.match(
      /Av\. Antonio Varas\s+2223,\s*Ñuñoa,\s*Regi[óo]n Metropolitana/i,
    )?.[0] || null;
  }
  const links = Array.from(document.querySelectorAll("a[href],iframe[src]"))
    .map((node: any) =>
      node.getAttribute("href") || node.getAttribute("src") || ""
    );
  const mapUrl =
    links.find((url: string) => /google\.(?:com|cl)\/maps\/place/.test(url)) ||
    links.find((url: string) => url.startsWith("https://maps.app.goo.gl/")) ||
    null;
  // Coordinates are read only from an explicit place point, never a map viewport center.
  const point = mapUrl?.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  return {
    ...config,
    address,
    hours,
    hoursText,
    closedOnHolidays,
    mapUrl,
    latitude: point ? Number(point[1]) : null,
    longitude: point ? Number(point[2]) : null,
    checkedAt: new Date().toISOString(),
    status: "ok",
    error: null,
  };
}

export async function scrapeStore(
  config: StoreConfig,
  previous?: Store,
): Promise<Store> {
  try {
    const store = parseContact(await fetchPage(config.contactUrl), config);
    if (
      store.latitude === null && store.address &&
      previous?.address === store.address && previous.latitude !== null
    ) {
      store.latitude = previous.latitude;
      store.longitude = previous.longitude;
      store.locationSource = previous.locationSource;
      store.locationAccuracy = previous.locationAccuracy;
    }
    if (
      store.latitude === null &&
      store.mapUrl?.startsWith("https://maps.app.goo.gl/")
    ) {
      try {
        const resolved = await fetchText(store.mapUrl, 5_000_000);
        const point = (resolved.url + resolved.text).match(
          /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
        );
        if (point) {
          store.latitude = Number(point[1]);
          store.longitude = Number(point[2]);
        }
      } catch {
        /* Preserve unknown location when the published map cannot be resolved. */
      }
    }
    if (store.latitude !== null && !store.locationSource) {
      store.locationSource = store.mapUrl || config.contactUrl;
      store.locationAccuracy = "published_map_point";
    }
    if (store.latitude === null && store.address) {
      try {
        const url = "https://nominatim.openstreetmap.org/search?" +
          new URLSearchParams({
            q: store.address.replace(/,?\s*(?:Local|Nivel|Piso)[^,]*/gi, ""),
            format: "jsonv2",
            countrycodes: "cl",
            limit: "1",
          });
        const results = JSON.parse((await fetchText(url, 100000)).text);
        const point = results[0];
        if (
          point && Number(point.lat) < -17 && Number(point.lat) > -56 &&
          Number(point.lon) < -66 && Number(point.lon) > -76
        ) {
          store.latitude = Number(point.lat);
          store.longitude = Number(point.lon);
          store.locationSource = url;
          store.locationAccuracy = "geocoded_address";
        }
        await new Promise((resolve) => setTimeout(resolve, 1100));
      } catch { /* Geocoding failure leaves distance unknown. */ }
    }
    return store;
  } catch (error) {
    return {
      ...config,
      address: null,
      latitude: null,
      longitude: null,
      mapUrl: null,
      hours: null,
      hoursText: null,
      closedOnHolidays: false,
      checkedAt: new Date().toISOString(),
      status: "error",
      error: error instanceof Error ? error.message : "Store scraper failed",
    };
  }
}
