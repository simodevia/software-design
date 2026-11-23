import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ProductCard from "./components/ProductCard.jsx";
import AuthBar from "./components/AuthBar.jsx";
import StoreList from "./components/StoreList.jsx";
import { getJson } from "./api.js";
import { distanceKm } from "./geo.js";

const categories = ["RAM", "GPU", "CPU"];
const languages = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];
const radiusOptions = ["5", "20", "50", "200"];
const imageDirectory = `${import.meta.env.BASE_URL}images/`;

export default function App() {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [status, setStatus] = useState("loading");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [location, setLocation] = useState(null);
  const [geoMessage, setGeoMessage] = useState("");
  const [radius, setRadius] = useState("20");
  const [collection, setCollection] = useState({
    refreshing: false,
    lastRun: null,
  });

  const language = i18n.resolvedLanguage || "en";
  const locale = language === "en" ? "en-US" : "es-CL";
  const isLocating = geoMessage === "geo.loading";

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = "Price Comparator";
  }, [language]);

  useEffect(() => {
    let active = true;
    let loading = false;

    async function reload() {
      if (loading) return;
      loading = true;

      try {
        const [catalog, branches, progress] = await Promise.all([
          getJson("/api/products"),
          getJson("/api/stores"),
          getJson("/api/status"),
        ]);

        if (active) {
          setProducts(catalog);
          setStores(branches);
          setCollection(progress);
          setStatus("ready");
        }
      } catch {
        if (active) setStatus("error");
      } finally {
        loading = false;
      }
    }

    reload();
    const timer = setInterval(reload, 15000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  function selectLanguage(event, code) {
    const menu = event.currentTarget.closest("details");

    if (menu) {
      menu.open = false;
      menu.querySelector("summary")?.focus();
    }

    void i18n.changeLanguage(code);
  }

  function locate() {
    if (!navigator.geolocation) {
      setGeoMessage("geo.unsupported");
      return;
    }

    setGeoMessage("geo.loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGeoMessage("geo.ready");
      },
      (error) => {
        setGeoMessage(error.code === 1 ? "geo.denied" : "geo.failed");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  }

  function clearLocation() {
    setLocation(null);
    setNearbyOnly(false);
    setGeoMessage("");
  }

  const searchTerm = searchQuery.trim().toLowerCase();

  const visibleProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm);
    const matchesCategory = category === "all" || category === product.category;

    if (!matchesSearch || !matchesCategory) return false;

    const availableOffers = product.offers.filter(
      (offer) =>
        offer.status === "ok" && !offer.stale && offer.stock === "in_stock",
    );

    if (inStockOnly && availableOffers.length === 0) return false;

    if (nearbyOnly && location) {
      return availableOffers.some((offer) => {
        const store = stores.find((entry) => entry.id === offer.storeId);
        const distance = store ? distanceKm(location, store) : null;

        return distance !== null && distance <= Number(radius);
      });
    }

    return true;
  });

  return (
    <main className="page">
      <header className="page-header page-header--band">
        <h1 className="brand-title">
          <img
            src={`${imageDirectory}price-comparator-horizontal.png`}
            alt="Price Comparator"
          />
        </h1>

        <div className="header-actions">
          <AuthBar
            refreshing={collection.refreshing}
            onRefresh={() =>
              setCollection((value) => ({ ...value, refreshing: true }))
            }
          />

          <details className="language-menu">
            <summary className="language-trigger" aria-label={t("language")}>
              <img
                src={`${imageDirectory}language-globe.png`}
                alt=""
                width={22}
                height={22}
              />
            </summary>

            <div className="language-options">
              {languages.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  lang={code}
                  aria-pressed={language === code}
                  onClick={(event) => selectLanguage(event, code)}
                >
                  {label}
                </button>
              ))}
            </div>
          </details>
        </div>

        <div className="header-search" role="search">
          <input
            id="search"
            type="search"
            aria-label={t("search")}
            placeholder={t("search")}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="header-location">
          <button
            className="location-trigger"
            type="button"
            disabled={isLocating}
            aria-describedby="location-privacy"
            onClick={locate}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {t("geo.locate")}
          </button>

          <span className="location-status" role="status">
            {geoMessage && t(geoMessage)}
          </span>

          {location && (
            <div className="location-radius">
              <div>
                <label htmlFor="radius">{t("geo.radius")}</label>
                <select
                  id="radius"
                  value={radius}
                  onChange={(event) => setRadius(event.target.value)}
                >
                  {radiusOptions.map((value) => (
                    <option key={value} value={value}>
                      {value} km
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="secondary"
                disabled={isLocating}
                onClick={clearLocation}
              >
                {t("geo.clear")}
              </button>
            </div>
          )}
        </div>

        <div className="header-filters">
          <div className="field">
            <label htmlFor="category">{t("category")}</label>
            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">{t("all")}</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {t(`categories.${value}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="check-filters">
            <label>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) => setInStockOnly(event.target.checked)}
              />
              {t("inStockOnly")}
            </label>

            <label>
              <input
                type="checkbox"
                disabled={!location}
                checked={nearbyOnly}
                onChange={(event) => setNearbyOnly(event.target.checked)}
              />
              {t("geo.nearbyFilter")}
            </label>
          </div>
        </div>

        <p id="location-privacy" className="muted header-notice">
          {t("geo.privacy")}
        </p>

        <p className="header-notice">{t("liveNotice")}</p>
      </header>

      <p role="status">
        {collection.refreshing
          ? t("collecting")
          : collection.lastRun
            ? `${t("lastRun")} ${new Date(collection.lastRun).toLocaleString(locale)}`
            : t("waiting")}
      </p>

      {status === "loading" && <p role="status">{t("loading")}</p>}

      {status === "error" && (
        <p role="alert" className="error-message">
          {t("error")}
        </p>
      )}

      {status === "ready" && (
        <>
          <p role="status">
            {t("results")} <strong>{visibleProducts.length}</strong>
          </p>

          {visibleProducts.length === 0 && <p>{t("noProducts")}</p>}

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}

      <StoreList stores={stores} location={location} />
    </main>
  );
}