import { networkFetch } from "./network.ts";
import {
  createRemoteJWKSet,
  customFetch,
  type JWTPayload,
  jwtVerify,
} from "jose";

export type AuthConfig = {
  origin: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type User = {
  id: string;
  name: string;
  email: string;
};

type Login = {
  nonce: string;
  verifier: string;
  expires: number;
};

type Session = {
  user: User;
  csrf: string;
  expires: number;
};

const LOGIN_TTL_MS = 10 * 60_000;
const SESSION_TTL_MS = 8 * 60 * 60_000;
const TOKEN_TIMEOUT_MS = 15_000;

const MAX_PENDING_LOGINS = 500;
const MAX_SESSIONS = 5_000;

const LOGIN_COOKIE = "pricewise_login";
const SESSION_COOKIE = "pricewise_session";

const AUTHORIZATION_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs";

const AUTH_ROUTES = new Map<string, string>([
  ["/api/auth/session", "GET"],
  ["/api/auth/login", "GET"],
  ["/api/auth/callback", "GET"],
  ["/api/auth/logout", "POST"],
]);

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function parseApplicationUrl(value: string, name: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }

  if (url.username || url.password) {
    throw new Error(`${name} must not contain credentials`);
  }

  const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
  const isAllowedProtocol = url.protocol === "https:" ||
    (url.protocol === "http:" && isLocal);

  if (!isAllowedProtocol) {
    throw new Error(
      `${name} requires HTTPS, except for local HTTP development`,
    );
  }

  if (url.search || url.hash) {
    throw new Error(`${name} must not contain a query or fragment`);
  }

  return url;
}

export function validateIdentity(
  payload: JWTPayload,
  nonce: string,
  clientId: string,
): User {
  if (
    payload.nonce !== nonce ||
    typeof payload.sub !== "string" ||
    payload.sub.length === 0 ||
    payload.email_verified !== true ||
    typeof payload.email !== "string" ||
    payload.email.trim().length === 0
  ) {
    throw new Error("Invalid identity claims");
  }

  if (
    payload.azp !== undefined &&
    payload.azp !== clientId
  ) {
    throw new Error("Invalid authorized party");
  }

  if (
    Array.isArray(payload.aud) &&
    payload.aud.length > 1 &&
    payload.azp !== clientId
  ) {
    throw new Error("Missing authorized party");
  }

  return {
    id: payload.sub,
    email: payload.email,
    name: typeof payload.name === "string" &&
        payload.name.trim().length > 0
      ? payload.name
      : payload.email,
  };
}

export function createAuth(config: AuthConfig) {
  const origin = parseApplicationUrl(config.origin, "APP_ORIGIN");
  const callback = parseApplicationUrl(
    config.redirectUri,
    "GOOGLE_REDIRECT_URI",
  );

  if (origin.pathname !== "/") {
    throw new Error("APP_ORIGIN must not contain an application path");
  }

  if (
    callback.origin !== origin.origin ||
    callback.pathname !== "/api/auth/callback"
  ) {
    throw new Error("Invalid SSO callback origin or path");
  }

  const clientId = config.clientId.trim();
  const clientSecret = config.clientSecret.trim();

  if (Boolean(clientId) !== Boolean(clientSecret)) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be configured",
    );
  }

  const enabled = Boolean(clientId && clientSecret);
  const secure = origin.protocol === "https:";

  const sessions = new Map<string, Session>();
  const logins = new Map<string, Login>();

  const keys = createRemoteJWKSet(
    new URL(GOOGLE_KEYS_URL),
    { [customFetch]: networkFetch },
  );

  function cookie(
    name: string,
    value: string,
    lifetimeMs: number,
  ): string {
    const seconds = Math.max(0, Math.floor(lifetimeMs / 1000));

    return [
      `${name}=${value}`,
      "HttpOnly",
      "SameSite=Lax",
      "Path=/api",
      `Max-Age=${seconds}`,
      ...(secure ? ["Secure"] : []),
    ].join("; ");
  }

  function readCookie(request: Request, name: string): string {
    const header = request.headers.get("cookie") || "";

    for (const part of header.split(";")) {
      const trimmed = part.trim();
      const separator = trimmed.indexOf("=");

      if (
        separator !== -1 &&
        trimmed.slice(0, separator) === name
      ) {
        return trimmed.slice(separator + 1);
      }
    }

    return "";
  }

  function json(
    data: unknown,
    status = 200,
    extraHeaders: HeadersInit = {},
  ): Response {
    const headers = new Headers(extraHeaders);

    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");

    return Response.json(data, { status, headers });
  }

  function redirect(
    destination: URL,
    cookies: string[] = [],
  ): Response {
    const headers = new Headers({
      Location: destination.href,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });

    for (const value of cookies) {
      headers.append("Set-Cookie", value);
    }

    return new Response(null, { status: 302, headers });
  }

  function redirectHome(
    error?: string,
    cookies: string[] = [],
  ): Response {
    const destination = new URL("/", origin);

    if (error) {
      destination.searchParams.set("authError", error);
    }

    return redirect(destination, cookies);
  }

  function cleanup(): void {
    const now = Date.now();

    for (const [id, current] of sessions) {
      if (current.expires <= now) {
        sessions.delete(id);
      }
    }

    for (const [state, pending] of logins) {
      if (pending.expires <= now) {
        logins.delete(state);
      }
    }
  }

  function session(request: Request): Session | undefined {
    cleanup();

    return sessions.get(readCookie(request, SESSION_COOKIE));
  }

  function authorizedMutation(request: Request): boolean {
    const current = session(request);

    return Boolean(
      current &&
        request.headers.get("origin") === origin.origin &&
        request.headers.get("X-CSRF-Token") === current.csrf,
    );
  }

  async function handle(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (
      path !== "/api/auth" &&
      !path.startsWith("/api/auth/")
    ) {
      return null;
    }

    cleanup();

    const allowedMethod = AUTH_ROUTES.get(path);

    if (!allowedMethod) {
      return json({ message: "Endpoint not found" }, 404);
    }

    if (request.method !== allowedMethod) {
      return json(
        { message: "Method not allowed" },
        405,
        { Allow: allowedMethod },
      );
    }

    if (path === "/api/auth/session") {
      const current = session(request);

      return json({
        enabled,
        user: current?.user || null,
        csrfToken: current?.csrf || null,
      });
    }

    if (path === "/api/auth/login") {
      if (!enabled) {
        return redirectHome("unconfigured");
      }

      const oldState = readCookie(request, LOGIN_COOKIE);
      logins.delete(oldState);

      if (logins.size >= MAX_PENDING_LOGINS) {
        return json(
          { message: "Too many login attempts" },
          429,
        );
      }

      const state = randomToken();
      const nonce = randomToken();
      const verifier = randomToken();

      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(verifier),
      );

      const challenge = btoa(
        String.fromCharCode(...new Uint8Array(digest)),
      )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Recheck after the asynchronous digest operation.
      cleanup();

      if (logins.size >= MAX_PENDING_LOGINS) {
        return json(
          { message: "Too many login attempts" },
          429,
        );
      }

      logins.set(state, {
        nonce,
        verifier,
        expires: Date.now() + LOGIN_TTL_MS,
      });

      const destination = new URL(AUTHORIZATION_URL);

      destination.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callback.href,
        response_type: "code",
        scope: "openid email profile",
        state,
        nonce,
        code_challenge: challenge,
        code_challenge_method: "S256",
      }).toString();

      return redirect(destination, [
        cookie(LOGIN_COOKIE, state, LOGIN_TTL_MS),
      ]);
    }

    if (path === "/api/auth/callback") {
      const clearLogin = cookie(LOGIN_COOKIE, "", 0);

      if (!enabled) {
        return redirectHome("unconfigured", [clearLogin]);
      }

      const state = url.searchParams.get("state") || "";
      const pending = logins.get(state);

      if (
        !pending ||
        pending.expires <= Date.now() ||
        state !== readCookie(request, LOGIN_COOKIE)
      ) {
        return redirectHome("invalid", [clearLogin]);
      }

      // Each login attempt can be consumed only once.
      logins.delete(state);

      const code = url.searchParams.get("code");

      if (!code || url.searchParams.has("error")) {
        return redirectHome("cancelled", [clearLogin]);
      }

      let failureStage = "token_exchange";

      try {
        const response = await networkFetch(TOKEN_URL, {
          method: "POST",
          signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: callback.href,
            grant_type: "authorization_code",
            code_verifier: pending.verifier,
          }),
        });

        if (!response.ok) {
          await response.body?.cancel();
          throw new Error("Token exchange failed");
        }

        failureStage = "token_response";

        const tokens: unknown = await response.json();

        if (
          typeof tokens !== "object" ||
          tokens === null ||
          !("id_token" in tokens) ||
          typeof tokens.id_token !== "string"
        ) {
          throw new Error("Missing ID token");
        }

        failureStage = "identity_verification";

        const { payload } = await jwtVerify(tokens.id_token, keys, {
          issuer: [
            "https://accounts.google.com",
            "accounts.google.com",
          ],
          audience: clientId,
          algorithms: ["RS256"],
          requiredClaims: ["exp", "iat", "sub", "nonce"],
          clockTolerance: 5,
        });

        const user = validateIdentity(
          payload,
          pending.nonce,
          clientId,
        );

        failureStage = "session_creation";

        cleanup();

        const previousSessionId = readCookie(
          request,
          SESSION_COOKIE,
        );

        if (
          sessions.size >= MAX_SESSIONS &&
          !sessions.has(previousSessionId)
        ) {
          throw new Error("Session capacity reached");
        }

        const id = randomToken();
        const csrf = randomToken();

        sessions.delete(previousSessionId);

        sessions.set(id, {
          user,
          csrf,
          expires: Date.now() + SESSION_TTL_MS,
        });

        return redirectHome(undefined, [
          clearLogin,
          cookie(SESSION_COOKIE, id, SESSION_TTL_MS),
        ]);
      } catch {
        // Log only a controlled stage, never tokens or credentials.
        console.error(
          `SSO callback failed at stage: ${failureStage}`,
        );

        return redirectHome("failed", [clearLogin]);
      }
    }

    if (path === "/api/auth/logout") {
      if (!session(request)) {
        const response = json(
          { message: "Sign in required" },
          401,
        );

        response.headers.append(
          "Set-Cookie",
          cookie(SESSION_COOKIE, "", 0),
        );

        return response;
      }

      if (!authorizedMutation(request)) {
        return json({ message: "Forbidden" }, 403);
      }

      sessions.delete(readCookie(request, SESSION_COOKIE));

      const response = json({ ok: true });

      response.headers.append(
        "Set-Cookie",
        cookie(SESSION_COOKIE, "", 0),
      );

      return response;
    }

    return json({ message: "Endpoint not found" }, 404);
  }

  return {
    handle,
    authorizedMutation,
    session,
  };
}