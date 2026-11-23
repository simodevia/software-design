import assert from "node:assert/strict";
import { parseContact, parseProduct, parseStock } from "../scraper.ts";
import { robotAllowed } from "../http.ts";
import { openingStatus } from "../availability.ts";
import { distanceKm } from "../../frontend/src/geo.js";
import { createAuth, validateIdentity } from "../auth.ts";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

const source = {
  storeId: "centralgamer",
  url: "https://centralgamer.cl/product/cpu/",
  identity: ["9800X3D"],
};
const ld = (product: object) =>
  `<script type="application/ld+json">${JSON.stringify(product)}</script>`;
const offerProduct = {
  "@type": "Product",
  name: "AMD Ryzen 7 9800X3D",
  url: source.url,
  offers: {
    "@type": "Offer",
    price: "549990",
    priceCurrency: "CLP",
    availability: "https://schema.org/OutOfStock",
  },
};

Deno.test("Scraper uses the exact product, handles missing stock, and rejects unrelated recommendations", () => {
  const parsed = parseProduct(ld(offerProduct), source);
  assert.equal(parsed.price, 549990);
  assert.equal(parsed.stock, "out_of_stock");
  assert.throws(() =>
    parseProduct(ld({ ...offerProduct, name: "AMD Ryzen 7 9850X3D" }), source)
  );
  assert.throws(() =>
    parseProduct(
      ld({ ...offerProduct, url: "https://centralgamer.cl/product/other/" }),
      source,
    )
  );
  assert.equal(parseStock("https://schema.org/BackOrder"), "preorder");
  assert.equal(parseStock("available maybe"), "unknown");
  const unknown = parseProduct(
    ld({
      ...offerProduct,
      offers: { ...offerProduct.offers, availability: undefined },
    }),
    source,
  );
  assert.equal(unknown.stock, "unknown");
});

Deno.test("Winpy adapter preserves CLP integer amounts and actual inventory quantity", () => {
  const html =
    '<meta property="product:retailer_item_id" content="KF432C16BB/8"><meta property="product:price:amount" content="98496"><meta property="product:price:currency" content="CLP"><meta property="product:availability" content="in_stock"><div id="stock-product"><h3>4 unidades en stock</h3></div>';
  assert.deepEqual(
    parseProduct(html, {
      storeId: "winpy",
      url: "https://www.winpy.cl/ram/",
      identity: ["KF432C16BB/8"],
    }),
    {
      price: 98496,
      currency: "CLP",
      stock: "in_stock",
      quantity: 4,
      validThrough: null,
    },
  );
  assert.throws(() =>
    parseProduct(html, {
      storeId: "winpy",
      url: "https://www.winpy.cl/ram/",
      identity: ["KF432C16BB/16"],
    })
  );
});

Deno.test("Robots supports longest-path allow exceptions and private areas", () => {
  const text =
    "User-agent: *\nDisallow: /private/\nAllow: /private/public/\nDisallow: /*?add-to-cart=*";
  assert.equal(robotAllowed(text, "/private/secret"), false);
  assert.equal(robotAllowed(text, "/private/public/item"), true);
  assert.equal(robotAllowed(text, "/product/?add-to-cart=3"), false);
  assert.equal(robotAllowed(text, "/product/"), true);
});

Deno.test("Published hours respect Chile time, holidays and missing weekend data", () => {
  const store = parseContact(
    "<html><body>Antonio Varas #303, Local 4, Providencia, Santiago. Lunes a Jueves de 10:00 a 18:30 Hrs. Viernes de 10:00 a 18:00 Hrs. Sábados de 10:00 a 14:00 Hrs. Domingos y Festivos cerrados.</body></html>",
    {
      id: "centralgamer",
      name: "Central Gamer",
      contactUrl: "https://centralgamer.cl/contacto/",
      timeZone: "America/Santiago",
    },
  );
  const holidays = {
    year: 2026,
    dates: ["2026-11-23"],
    source: "fixture",
    checkedAt: new Date().toISOString(),
  };
  assert.equal(
    openingStatus(store, holidays, new Date("2026-11-24T14:00:00Z")),
    "open",
  );
  assert.equal(
    openingStatus(store, holidays, new Date("2026-11-23T14:00:00Z")),
    "closed",
  );
  assert.equal(
    openingStatus(store, null, new Date("2026-11-24T14:00:00Z")),
    "unknown",
  );
  assert.equal(
    openingStatus(
      { ...store, hours: { "1": [["10:00", "18:00"]] } },
      holidays,
      new Date("2026-11-28T14:00:00Z"),
    ),
    "unknown",
  );
});

Deno.test("Location calculates real distance and keeps missing coordinates unknown", () => {
  assert.equal(
    distanceKm({ latitude: -33.438436, longitude: -70.625578 }, {
      latitude: -33.438436,
      longitude: -70.625578,
    }),
    0,
  );
  const distance = distanceKm({ latitude: -34.17, longitude: -70.74 }, {
    latitude: -33.438436,
    longitude: -70.625578,
  });
  assert.ok(distance !== null && distance > 80 && distance < 90);
  assert.equal(
    distanceKm({ latitude: 0, longitude: 0 }, {
      latitude: null,
      longitude: null,
    }),
    null,
  );
});

Deno.test("SSO rejects invalid identity and callback state", async () => {
  assert.throws(() =>
    validateIdentity(
      {
        sub: "user",
        email: "a@example.com",
        email_verified: true,
        nonce: "wrong",
      },
      "expected",
      "client",
    )
  );
  const auth = createAuth({
    origin: "http://localhost:5173",
    clientId: "client",
    clientSecret: "secret",
    redirectUri: "http://localhost:5173/api/auth/callback",
  });
  const response = await auth.handle(
    new Request(
      "http://localhost:8000/api/auth/callback?state=wrong&code=code",
    ),
  );
  assert.equal(response!.status, 302);
  assert.ok(response!.headers.get("location")!.includes("authError=invalid"));
  const logout = await auth.handle(
    new Request("http://localhost:8000/api/auth/logout", { method: "POST" }),
  );
  assert.equal(logout!.status, 401);
});

Deno.test("SSO verifies signed Google response, uses PKCE, prevents replay and validates logout CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  Object.assign(jwk, { kid: "test-key", alg: "RS256", use: "sig" });
  const auth = createAuth({
    origin: "http://localhost:5173",
    clientId: "test-client",
    clientSecret: "test-secret",
    redirectUri: "http://localhost:5173/api/auth/callback",
  });
  const login = await auth.handle(
    new Request("http://localhost:8000/api/auth/login"),
  );
  const target = new URL(login!.headers.get("location")!);
  assert.equal(target.searchParams.get("code_challenge_method"), "S256");
  const state = target.searchParams.get("state")!;
  const nonce = target.searchParams.get("nonce")!;
  const jwt = await new SignJWT({
    nonce,
    email: "student@example.com",
    email_verified: true,
    name: "Student",
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" }).setSubject("student")
    .setIssuer("https://accounts.google.com").setAudience("test-client")
    .setIssuedAt().setExpirationTime("5m").sign(privateKey);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://oauth2.googleapis.com/token") {
      const body = init?.body as URLSearchParams;
      assert.ok(body.get("code_verifier"));
      assert.equal(body.get("client_secret"), "test-secret");
      return Response.json({ id_token: jwt });
    }
    if (url === "https://www.googleapis.com/oauth2/v3/certs") {
      return Response.json({ keys: [jwk] });
    }
    throw new Error("Unexpected external request in SSO test");
  };
  try {
    const callbackRequest = () =>
      new Request(
        `http://localhost:8000/api/auth/callback?state=${state}&code=one-use`,
        { headers: { cookie: `pricewise_login=${state}` } },
      );
    const callback = await auth.handle(callbackRequest());
    assert.equal(callback!.headers.get("location"), "http://localhost:5173/");
    const cookies = callback!.headers.getSetCookie();
    const sessionCookie = cookies.find((value) =>
      value.startsWith("pricewise_session=")
    )!.split(";")[0];
    assert.ok(cookies.every((cookie) =>
      cookie.includes("HttpOnly") && cookie.includes("SameSite=Lax")
    ));
    const session = await (await auth.handle(
      new Request("http://localhost:8000/api/auth/session", {
        headers: { cookie: sessionCookie },
      }),
    ))!.json();
    assert.equal(session.user.email, "student@example.com");
    assert.equal(
      auth.authorizedMutation(
        new Request("http://localhost:8000/api/refresh", {
          method: "POST",
          headers: {
            cookie: sessionCookie,
            origin: "https://attacker.example",
            "X-CSRF-Token": session.csrfToken,
          },
        }),
      ),
      false,
    );
    const replay = await auth.handle(callbackRequest());
    assert.ok(replay!.headers.get("location")!.includes("authError=invalid"));
    const logout = await auth.handle(
      new Request("http://localhost:8000/api/auth/logout", {
        method: "POST",
        headers: {
          cookie: sessionCookie,
          origin: "http://localhost:5173",
          "X-CSRF-Token": session.csrfToken,
        },
      }),
    );
    assert.equal(logout!.status, 200);
    assert.equal(
      auth.session(
        new Request("http://localhost:8000/api/auth/session", {
          headers: { cookie: sessionCookie },
        }),
      ),
      undefined,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test('History persistence replaces state atomically and prevents concurrent writers', async () => {
  const {readState,saveState,acquireLock} = await import('../storage.ts');
  const directory = new URL('file://'+await Deno.makeTempDir()+'/');
  try {
    const initial = await readState(directory);
    const release = await acquireLock(directory);
    await assert.rejects(()=>acquireLock(directory),Deno.errors.AlreadyExists);
    await saveState({...initial,lastRun:'2026-11-21T12:00:00Z'},directory);
    assert.equal((await readState(directory)).lastRun,'2026-11-21T12:00:00Z');
    await release();
    const releaseAgain = await acquireLock(directory);
    await releaseAgain();
    await Deno.writeTextFile(new URL('state.json',directory),'broken');
    await assert.rejects(()=>readState(directory));
  } finally {await Deno.remove(directory,{recursive:true});}
});
