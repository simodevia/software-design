import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ProductCard from "./components/ProductCard.jsx";

const categories = ["RAM", "GPU", "CPU"];

export default function App() {
  const { t, i18n } = useTranslation();

  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const language = i18n.resolvedLanguage || "es";
  const locale = language === "en" ? "en-US" : "es-CL";

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t("appName");
  }, [language, t]);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/products");

        if (!response.ok) {
          throw new Error("Could not load products");
        }

        const catalog = await response.json();
        setProducts(catalog);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }

    loadProducts();
  }, []);

  const searchTerm = searchQuery.trim().toLowerCase();

  const filteredProducts = products.filter((product) => {
    const matchesName = product.name.toLowerCase().includes(searchTerm);
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;

    return matchesName && matchesCategory;
  });

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>{t("appName")}</h1>
          <p>{t("description")}</p>
        </div>

        <div className="language-control">
          <label htmlFor="language">{t("language")}</label>

          <select
            id="language"
            value={language}
            onChange={(event) => i18n.changeLanguage(event.target.value)}
          >
            <option value="es">{t("spanish")}</option>
            <option value="en">{t("english")}</option>
          </select>
        </div>
      </header>

      <p className="sample-notice">{t("sampleData")}</p>

      <div role="status">
        {status === "loading" && <p>{t("loading")}</p>}
      </div>

      {status === "error" && (
        <p className="error-message" role="alert">
          {t("error")}
        </p>
      )}

      {status === "ready" && (
        <>
          <div className="filters">
            <div className="field">
              <label htmlFor="product-search">{t("search")}</label>

              <input
                id="product-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="product-category">{t("category")}</label>

              <select
                id="product-category"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                <option value="all">{t("all")}</option>

                {categories.map((category) => (
                  <option key={category} value={category}>
                    {t(`categories.${category}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p role="status">
            {t("results")}{" "}
            <strong>
              {new Intl.NumberFormat(locale).format(filteredProducts.length)}
            </strong>
          </p>

          {filteredProducts.length === 0 && <p>{t("noProducts")}</p>}

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}