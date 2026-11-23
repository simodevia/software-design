import React from "react";
import { useTranslation } from "react-i18next";
import PriceHistory from "./PriceHistory.jsx";

const comparisonCurrency = "CLP";

export default function ProductCard({ product }) {
  const { t, i18n } = useTranslation();

  const locale =
    i18n.resolvedLanguage === "en" ? "en-US" : "es-CL";

  function isVerifiedOffer(offer) {
    return (
      offer.status === "ok" &&
      !offer.stale &&
      offer.stock === "in_stock" &&
      Number.isFinite(offer.price) &&
      offer.price > 0 &&
      offer.currency === comparisonCurrency
    );
  }

  function formatPrice(offer) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: offer.currency,
      currencyDisplay: "code",
    }).format(offer.price);
  }

  function formatDate(value) {
    return new Date(value).toLocaleString(locale);
  }

  const sortedOffers = [...product.offers].sort(
    (firstOffer, secondOffer) => {
      const availabilityOrder =
        Number(isVerifiedOffer(secondOffer)) -
        Number(isVerifiedOffer(firstOffer));

      return (
        availabilityOrder ||
        (firstOffer.price ?? Infinity) -
          (secondOffer.price ?? Infinity)
      );
    },
  );

  const lowestOffer = sortedOffers.find(isVerifiedOffer);

  return (
    <article className="product-card">
      {["RAM", "GPU", "CPU"].includes(product.category) && (
        <div
          className={`product-image product-image--${product.category.toLowerCase()}`}
          aria-hidden="true"
        />
      )}
      <span className="category-label">
        {t(`categories.${product.category}`)}
      </span>

      <h2>{product.name}</h2>

      {lowestOffer ? (
        <div className="price-summary">
          <span>{t("lowestPrice")}</span>
          <strong>{formatPrice(lowestOffer)}</strong>
        </div>
      ) : (
        <p>{t("noVerifiedStock")}</p>
      )}

      <h3>{t("offers")}</h3>

      <ul className="offer-list">
        {sortedOffers.map((offer) => {
          const isRecentObservation =
            offer.status === "ok" && !offer.stale;

          const stockStatus = isRecentObservation
            ? offer.stock
            : "unknown";

          const isLowestPrice =
            isVerifiedOffer(offer) &&
            offer.price === lowestOffer?.price;

          const hasReportedQuantity =
            isRecentObservation &&
            Number.isFinite(offer.quantity) &&
            offer.quantity >= 0;

          return (
            <li className="offer-row" key={offer.storeId}>
              <div>
                <a
                  href={offer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {offer.store}
                </a>

                {isLowestPrice && (
                  <span className="price-badge">
                    {t("lowestPrice")}
                  </span>
                )}
              </div>

              <div className="offer-detail">
                <strong>
                  {Number.isFinite(offer.price)
                    ? formatPrice(offer)
                    : t("priceUnknown")}
                </strong>

                <span>{t(`stock.${stockStatus}`)}</span>

                {hasReportedQuantity && (
                  <span>
                    {t("quantity", {
                      count: offer.quantity,
                    })}
                  </span>
                )}

                <span className="muted">
                  {t("onlineStock")}
                </span>

                {offer.stale && (
                  <span>{t("stale")}</span>
                )}

                {offer.status === "error" && (
                  <span>{t("sourceError")}</span>
                )}

                {offer.status === "pending" && (
                  <span>{t("waiting")}</span>
                )}

                <span className="muted">
                  {t(
                    offer.storeId === "winpy"
                      ? "transferPrice"
                      : "publishedPrice",
                  )}
                </span>

                {offer.recordedAt && (
                  <span className="muted">
                    {t("checked")}{" "}
                    {formatDate(offer.recordedAt)}
                  </span>
                )}

                {offer.lastKnown && (
                  <span className="muted">
                    {t("lastKnown")}{" "}
                    {formatPrice(offer.lastKnown)}
                    {" — "}
                    {formatDate(
                      offer.lastKnown.recordedAt,
                    )}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <PriceHistory productId={product.id} />
    </article>
  );
}