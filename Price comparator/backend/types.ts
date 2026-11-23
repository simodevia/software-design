export type Stock =
  | "in_stock"
  | "out_of_stock"
  | "preorder"
  | "unknown";

export type Source = {
  storeId: string;
  url: string;
  identity: string[];
};

export type Product = {
  id: string;
  name: string;
  category: "RAM" | "GPU" | "CPU";
  sources: Source[];
};

export type Observation = {
  productId: string;
  storeId: string;
  store: string;
  url: string;
  price: number | null;
  currency: string;
  stock: Stock;
  quantity: number | null;
  stockScope: "online";
  recordedAt: string;
  status: "ok" | "error";
  error: string | null;
  priceBasis: "published";
  validThrough: string | null;
};

export type Hours = Record<string, [string, string][]>;

export type StoreConfig = {
  id: string;
  name: string;
  contactUrl: string;
  timeZone: string;
};

export type Store = StoreConfig & {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  locationSource?: string;
  locationAccuracy?: string;
  mapUrl: string | null;
  hours: Hours | null;
  hoursText: string | null;
  closedOnHolidays: boolean;
  checkedAt: string;
  status: "ok" | "error";
  error: string | null;
};

export type State = {
  version: 1;
  observations: Observation[];
  stores: Store[];
  holidays:
    | {
      year: number;
      dates: string[];
      source: string;
      checkedAt: string;
    }
    | null;
  lastRun: string | null;
};