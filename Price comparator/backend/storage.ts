import type { State } from "./types.ts";

export const dataDirectory = new URL("./data/", import.meta.url);

export async function readState(
  directory = dataDirectory,
): Promise<State> {
  const stateFile = new URL("state.json", directory);

  try {
    const state = JSON.parse(await Deno.readTextFile(stateFile));

    if (
      state.version !== 1 ||
      !Array.isArray(state.observations) ||
      !Array.isArray(state.stores)
    ) {
      throw new Error("Invalid state file");
    }

    return state;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return {
        version: 1,
        observations: [],
        stores: [],
        holidays: null,
        lastRun: null,
      };
    }

    throw error;
  }
}

export async function saveState(
  state: State,
  directory = dataDirectory,
): Promise<void> {
  const stateFile = new URL("state.json", directory);

  await Deno.mkdir(directory, { recursive: true });

  const temporaryFile = new URL(
    `state-${crypto.randomUUID()}.tmp`,
    directory,
  );

  try {
    await Deno.writeTextFile(
      temporaryFile,
      JSON.stringify(state, null, 2),
    );

    await Deno.rename(temporaryFile, stateFile);
  } finally {
    try {
      await Deno.remove(temporaryFile);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  }
}

export async function acquireLock(
  directory = dataDirectory,
): Promise<() => Promise<void>> {
  await Deno.mkdir(directory, { recursive: true });

  const lockFile = new URL("collector.lock", directory);

  const handle = await Deno.open(lockFile, {
    createNew: true,
    write: true,
  });

  try {
    await handle.write(
      new TextEncoder().encode(
        JSON.stringify({
          pid: Deno.pid,
          startedAt: new Date().toISOString(),
        }),
      ),
    );
  } catch (error) {
    await Deno.remove(lockFile);
    throw error;
  } finally {
    handle.close();
  }

  return async () => {
    await Deno.remove(lockFile);
  };
}
