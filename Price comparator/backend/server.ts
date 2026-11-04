const catalogFile = new URL("./catalog.json", import.meta.url);
const catalogText = await Deno.readTextFile(catalogFile);
const catalog = JSON.parse(catalogText);

Deno.serve({ hostname: "127.0.0.1", port: 8000 }, (request) => {
  const { pathname } = new URL(request.url);

  if (pathname !== "/api/products") {
    return Response.json({ message: "Endpoint not found" }, { status: 404 });
  }

  if (request.method !== "GET") {
    return Response.json(
      { message: "Method not allowed" },
      { status: 405, headers: { Allow: "GET" } },
    );
  }

  return Response.json(catalog);
});
