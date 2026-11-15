import React from "react";
import { useTranslation } from "react-i18next";

export default function ProductCard({ product }) {
  const { t, i18n } = useTranslation();

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CL";

  const priceFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
  });

  const sortedOffers = [...product.offers].sort(
    (firstOffer, secondOffer) => firstOffer.price - secondOffer.price,
  );

  const lowestPrice = sortedOffers[0]?.price;

  return (
    <article className="product-card">
      <span className="category-label">
        {t(`categories.${product.category}`)}
      </span>

      <h2>{product.name}</h2>

      {sortedOffers.length > 0 ? (
        <>
          <div className="price-summary">
            <span>{t("lowestPrice")}</span>
            <strong>{priceFormatter.format(lowestPrice)}</strong>
          </div>

          <h3>{t("offers")}</h3>

          <ul className="offer-list">
            {sortedOffers.map((offer) => (
              <li className="offer-row" key={offer.store}>
                <div>
                  <span>{offer.store}</span>

                  {offer.price === lowestPrice && (
                    <span className="price-badge">
                      {t("lowestPrice")}
                    </span>
                  )}
                </div>

                <strong>{priceFormatter.format(offer.price)}</strong>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>{t("noOffers")}</p>
      )}
    </article>
  );
}