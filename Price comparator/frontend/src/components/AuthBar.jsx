import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getJson } from "../api.js";

export default function AuthBar({ refreshing, onRefresh }) {
  const { t } = useTranslation();
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getJson("/api/auth/session")
      .then(setSession)
      .catch(() => setMessage("auth.connectionError"));

    const url = new URL(window.location.href);

    if (url.searchParams.has("authError")) {
      setMessage("auth.loginError");
      url.searchParams.delete("authError");
      window.history.replaceState(null, "", url);
    }
  }, []);

  async function mutate(path) {
    if (busy || !session?.csrfToken) return;

    setBusy(true);
    setMessage("");

    try {
      await getJson(path, {
        method: "POST",
        headers: { "X-CSRF-Token": session.csrfToken },
      });

      if (path === "/api/auth/logout") {
        setSession((current) => ({
          ...current,
          user: null,
          csrfToken: null,
        }));
      } else {
        setMessage("auth.refreshStarted");
        onRefresh();
      }
    } catch (error) {
      if (error.status === 401) {
        setSession((current) => ({
          ...current,
          user: null,
          csrfToken: null,
        }));
        setMessage("auth.expired");
      } else {
        setMessage(error.status === 429 ? "auth.cooldown" : "auth.actionError");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-panel">
      {session?.user ? (
        <>
          <p>
            {t("auth.signedIn")} <strong>{session.user.name}</strong>
          </p>

          <div className="button-row">
            <button
              type="button"
              disabled={busy || refreshing}
              onClick={() => mutate("/api/refresh")}
            >
              {t(refreshing ? "auth.refreshing" : "auth.refresh")}
            </button>

            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => mutate("/api/auth/logout")}
            >
              {t("auth.logout")}
            </button>
          </div>
        </>
      ) : session?.enabled ? (
        <a
          className="google-sign-in"
          href="/api/auth/login"
          aria-label={t("auth.login")}
        />
      ) : session ? (
        <p>{t("auth.unconfigured")}</p>
      ) : null}

      {message && <p role="status">{t(message)}</p>}
    </div>
  );
}