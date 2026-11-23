import { networkFetch } from "./network.ts";
const agent = "PricewiseAcademic/1.0 (educational price comparison)";
const robotsCache = new Map<string, string>();

export function robotAllowed(text: string, path: string): boolean {
  const groups: {
    agents: string[];
    rules: { path: string; allow: boolean }[];
  }[] = [];
  let group = {
    agents: [] as string[],
    rules: [] as { path: string; allow: boolean }[],
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (group.rules.length) {
        groups.push(group);
        group = { agents: [], rules: [] };
      }
      group.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && value) {
      group.rules.push({ path: value, allow: key === "allow" });
    }
  }
  groups.push(group);
  const specific = groups.filter((g) =>
    g.agents.some((a) => a !== "*" && agent.toLowerCase().includes(a))
  );
  const selected = specific.length
    ? specific
    : groups.filter((g) => g.agents.includes("*"));
  const matching = selected.flatMap((g) => g.rules).filter((rule) => {
    const pattern = rule.path.split("*").map((part) =>
      part.replace(/[.+?^{}()|[\]\\]/g, "\\$&")
    ).join(".*").replace(/\\\$$/, "$");
    return new RegExp("^" + pattern).test(path);
  }).sort((a, b) =>
    b.path.length - a.path.length || Number(b.allow) - Number(a.allow)
  );
  return matching[0]?.allow ?? true;
}

export async function fetchText(
  url: string,
  maxBytes = 5_000_000,
): Promise<{ text: string; url: string }> {
  const response = await networkFetch(url, {
    headers: { "User-Agent": agent, Accept: "text/html,application/json" },
    signal: AbortSignal.timeout(20000),
    redirect: "follow",
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`HTTP ${response.status}`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("Response too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return { text: new TextDecoder().decode(bytes), url: response.url };
}

export async function fetchPage(url: string): Promise<string> {
  const parsed = new URL(url);
  if (!robotsCache.has(parsed.origin)) {
    try {
      robotsCache.set(
        parsed.origin,
        (await fetchText(parsed.origin + "/robots.txt", 100000)).text,
      );
    } catch (error) {
      if (error instanceof Error && error.message === "HTTP 404") {
        robotsCache.set(parsed.origin, "");
      } else throw new Error("Could not verify robots.txt");
    }
  }
  if (
    !robotAllowed(
      robotsCache.get(parsed.origin)!,
      parsed.pathname + parsed.search,
    )
  ) throw new Error("Disallowed by robots.txt");
  const result = await fetchText(url);
  if (new URL(result.url).hostname !== parsed.hostname) {
    throw new Error("Unexpected cross-domain redirect");
  }
  return result.text;
}
