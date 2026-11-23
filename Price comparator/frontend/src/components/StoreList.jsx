import React, { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { distanceKm } from "../geo.js";

const weekdays = [1, 2, 3, 4, 5, 6, 0];

export default function StoreList({ stores = [], location }) {
  const { t, i18n } = useTranslation();
  const [selectedStoreId, setSelectedStoreId] = useState("");

  const isSpanish = i18n.resolvedLanguage === "es";
  const locale = isSpanish ? "es-CL" : "en-US";
  const selectedStore = stores.find((store) => store.id === selectedStoreId);
  const distance = selectedStore && location
    ? distanceKm(location, selectedStore)
    : null;

  const weekdayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    timeZone: "UTC",
  });

  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const distanceFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  });

  function formatWeekday(day) {
    return weekdayFormatter.format(new Date(Date.UTC(2024, 0, 7 + day)));
  }

  function formatTime(value) {
    const [hours, minutes] = value.split(":").map(Number);
    return timeFormatter.format(new Date(Date.UTC(2024, 0, 1, hours, minutes)));
  }

  function formatHours(intervals) {
    if (!Array.isArray(intervals)) {
      return t("stores.hoursUnavailable", {
        defaultValue: isSpanish ? "Horario no informado" : "Hours unavailable",
      });
    }

    if (intervals.length === 0) {
      return t("stores.closedDay", {
        defaultValue: isSpanish ? "Cerrado" : "Closed",
      });
    }

    return intervals
      .map(([start, end]) => `${formatTime(start)} – ${formatTime(end)}`)
      .join(", ");
  }

  const openingStatus =
    selectedStore?.status === "ok" &&
    ["open", "closed"].includes(selectedStore.openingStatus)
      ? selectedStore.openingStatus
      : "unknown";

  const checkedAt = Date.parse(selectedStore?.checkedAt ?? "");
  const hasCheckedAt = Number.isFinite(checkedAt);

  return (
    <section className="store-section">
      <div className="store-picker">
        <label htmlFor="store-select">{t("stores.title")}</label>

        <select
          id="store-select"
          value={selectedStore?.id ?? ""}
          disabled={stores.length === 0}
          onChange={(event) => setSelectedStoreId(event.target.value)}
        >
          <option value="">
            {t("stores.selectStore", {
              defaultValue: isSpanish
                ? "Selecciona una tienda"
                : "Select a store",
            })}
          </option>

          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </div>

      {selectedStore && (
        <div className="store-selection">
          <article className="store-card" aria-labelledby="selected-store-name">
            <h3 id="selected-store-name">{selectedStore.name}</h3>

            <p>{selectedStore.address || t("stores.noAddress")}</p>
            <p><strong>{t(`stores.${openingStatus}`)}</strong></p>

            {distance !== null && (
              <p>
                {t("stores.distance", {
                  value: distanceFormatter.format(distance),
                })}
              </p>
            )}

            <h4>
              {t("stores.publishedHours", {
                defaultValue: isSpanish
                  ? "Horarios publicados"
                  : "Published opening hours",
              })}
            </h4>

            {selectedStore.status === "ok" && selectedStore.hours ? (
              <dl className="opening-hours">
                {weekdays.map((day) => (
                  <Fragment key={day}>
                    <dt>{formatWeekday(day)}</dt>
                    <dd>{formatHours(selectedStore.hours[String(day)])}</dd>
                  </Fragment>
                ))}
              </dl>
            ) : (
              <p>{t("stores.noHours")}</p>
            )}

            {selectedStore.hoursText && (
              <details className="original-hours">
                <summary>
                  {t("stores.originalHours", {
                    defaultValue: isSpanish
                      ? "Ver horario original"
                      : "View original hours",
                  })}
                </summary>
                <p lang="es">{selectedStore.hoursText}</p>
              </details>
            )}

            <p className="muted">{t("stores.scope")}</p>

            {hasCheckedAt && (
              <p className="muted">
                {selectedStore.status === "ok"
                  ? t("stores.lastChecked", {
                      defaultValue: isSpanish ? "Última consulta" : "Last checked",
                    })
                  : t("stores.lastAttempt", {
                      defaultValue: isSpanish ? "Último intento" : "Last attempt",
                    })}
                {" · "}
                <time dateTime={new Date(checkedAt).toISOString()}>
                  {dateFormatter.format(checkedAt)}
                </time>
              </p>
            )}

            {selectedStore.status === "error" && (
              <p className="error-message">
                {t("stores.checkFailed", {
                  defaultValue: isSpanish
                    ? "No se pudo verificar la información de la tienda."
                    : "Could not verify store information.",
                })}
              </p>
            )}

            {selectedStore.contactUrl && (
              <p>
                <a href={selectedStore.contactUrl} target="_blank" rel="noopener noreferrer">
                  {t("stores.source")}
                </a>
              </p>
            )}

            {selectedStore.mapUrl && (
              <p>
                <a href={selectedStore.mapUrl} target="_blank" rel="noopener noreferrer">
                  {t("stores.map")}
                </a>
              </p>
            )}
          </article>
        </div>
      )}
    </section>
  );
}