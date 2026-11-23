import React, {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { getJson } from "../api.js";

const stockStatuses = [
  "in_stock",
  "out_of_stock",
  "preorder",
  "unknown",
];

export default function PriceHistory({ productId }) {
  const { t, i18n } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("idle");

  const requestController = useRef(null);
  const panelId = useId();

  const locale =
    i18n.resolvedLanguage === "en" ? "en-US" : "es-CL";

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  const changeFormatter = new Intl.NumberFormat(locale, {
    style: "percent",
    signDisplay: "always",
    maximumFractionDigits: 1,
  });

  useEffect(() => {
    return () => {
      requestController.current?.abort();
      requestController.current = null;
    };
  }, []);

  async function loadHistory() {
    requestController.current?.abort();

    const controller = new AbortController();
    requestController.current = controller;

    setStatus("loading");

    try {
      const history = await getJson(
        `/api/products/${encodeURIComponent(productId)}/history`,
        {
          signal: controller.signal,
        },
      );

      if (!Array.isArray(history)) {
        throw new Error("Invalid price history response");
      }

      const hasInvalidRecords = history.some(
        (record) =>
          !Number.isFinite(record?.price) ||
          record.price <= 0 ||
          !Number.isFinite(Date.parse(record.recordedAt)),
      );

      if (hasInvalidRecords) {
        throw new Error("Invalid price history record");
      }

      const sortedRecords = [...history].sort(
        (firstRecord, secondRecord) =>
          Date.parse(firstRecord.recordedAt) -
          Date.parse(secondRecord.recordedAt),
      );

      if (requestController.current !== controller) return;

      setRecords(sortedRecords);
      setStatus("ready");
    } catch {
      if (
        controller.signal.aborted ||
        requestController.current !== controller
      ) {
        return;
      }

      setStatus("error");
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
      }
    }
  }

  function toggleHistory() {
    if (isOpen) {
      setIsOpen(false);

      requestController.current?.abort();
      requestController.current = null;

      setStatus("idle");
      return;
    }

    setIsOpen(true);
    loadHistory();
  }

  function formatPrice(record) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: record.currency,
      currencyDisplay: "code",
    }).format(record.price);
  }

  const previousPrices = new Map();

  const historyRows = records.map((record) => {
    const storeId = record.storeId ?? record.store;
    const comparisonKey = `${storeId}-${record.currency}`;

    const previousPrice = previousPrices.get(comparisonKey);

    const change =
      previousPrice === undefined
        ? null
        : (record.price - previousPrice) / previousPrice;

    previousPrices.set(comparisonKey, record.price);

    return {
      ...record,
      change,
      stock: stockStatuses.includes(record.stock)
        ? record.stock
        : "unknown",
    };
  });

  return (
    <div className="price-history">
      <button
        className="history-button"
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggleHistory}
      >
        {t(isOpen ? "history.hide" : "history.show")}
      </button>

      <div id={panelId} hidden={!isOpen}>
        <div role="status">
          {status === "loading" && (
            <p>{t("history.loading")}</p>
          )}

          {status === "ready" && records.length === 0 && (
            <p>{t("history.empty")}</p>
          )}
        </div>

        {status === "error" && (
          <div>
            <p role="alert">{t("history.error")}</p>

            <button
              className="history-button"
              type="button"
              onClick={loadHistory}
            >
              {t("history.retry")}
            </button>
          </div>
        )}

        {status === "ready" && records.length > 0 && (
          <div
            className="history-table-wrapper"
            role="region"
            aria-label={t("history.title")}
            tabIndex={0}
          >
            <table className="history-table">
              <caption>{t("history.title")}</caption>

              <thead>
                <tr>
                  <th scope="col">
                    {t("history.date")} (UTC)
                  </th>

                  <th scope="col">
                    {t("history.store")}
                  </th>

                  <th scope="col">
                    {t("history.price")}
                  </th>

                  <th scope="col">
                    {t("history.stock")}
                  </th>

                  <th scope="col">
                    {t("history.change")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {historyRows.map((record) => (
                  <tr
                    key={`${record.productId}-${record.storeId ?? record.store}-${record.recordedAt}`}
                  >
                    <td>
                      <time dateTime={record.recordedAt}>
                        {dateFormatter.format(
                          new Date(record.recordedAt),
                        )}
                      </time>
                    </td>

                    <td>{record.store}</td>

                    <td>{formatPrice(record)}</td>

                    <td>
                      {t(`stock.${record.stock}`)}
                    </td>

                    <td>
                      {record.change === null
                        ? t("history.first")
                        : changeFormatter.format(
                            record.change,
                          )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}