let client: Deno.HttpClient | undefined;

// Optional corporate proxy support. Normal local installations use native fetch.
export function configureNetwork(): void {
  const proxy = Deno.env.get("HTTPS_PROXY") || Deno.env.get("https_proxy");
  const certificateFile = Deno.env.get("NODE_EXTRA_CA_CERTS");
  if (proxy || certificateFile) {
    client = Deno.createHttpClient({
      ...(proxy ? { proxy: { url: proxy } } : {}),
      ...(certificateFile
        ? { caCerts: [Deno.readTextFileSync(certificateFile)] }
        : {}),
    });
  }
}

export const networkFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    ...(client ? { client } : {}),
  });

export function closeNetwork(): void {
  client?.close();
  client = undefined;
}
