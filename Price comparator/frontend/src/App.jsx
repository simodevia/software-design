import React, { useEffect, useState } from "react";

export default function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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
    <main>
      <h1>Pricewise</h1>

      {status === "loading" && <p>Cargando catálogo…</p>}
      {status === "error" && <p>No se pudo cargar el catálogo.</p>}

      {status === "ready" && (
        <>
          <div>
            <label htmlFor="product-search">Buscar por nombre</label>
            <input
              id="product-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="product-category">Categoría</label>
            <select
              id="product-category"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <option value="all">Todas</option>
              <option value="RAM">RAM</option>
              <option value="GPU">Tarjetas gráficas</option>
              <option value="CPU">Procesadores</option>
            </select>
          </div>

          {filteredProducts.length === 0 && (
            <p>No hay productos que coincidan con los filtros.</p>
          )}

          <section>
            {filteredProducts.map((product) => {
              const sortedOffers = [...product.offers].sort(
                (firstOffer, secondOffer) => firstOffer.price - secondOffer.price,
              );
              const lowestPrice = sortedOffers[0]?.price;

              return (
                <article key={product.id}>
                  <h2>{product.name}</h2>

                  {sortedOffers.length === 0 ? (
                    <p>No hay ofertas disponibles.</p>
                  ) : (
                    <ul>
                      {sortedOffers.map((offer) => (
                        <li key={offer.store}>
                          {offer.store} — {offer.price.toFixed(2)}
                          {offer.price === lowestPrice && (
                            <strong> · Menor precio</strong>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}
