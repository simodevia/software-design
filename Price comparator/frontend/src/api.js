const defaultTimeout = 12000;

export async function getJson(path, options = {}) {
  const controller = new AbortController();
  const externalSignal = options.signal;

  function cancelRequest() {
    controller.abort();
  }

  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener("abort", cancelRequest, {
      once: true,
    });
  }

  const timeout = setTimeout(cancelRequest, defaultTimeout);

  try {
    const response = await fetch(path, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error("Request failed");
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);

    externalSignal?.removeEventListener(
      "abort",
      cancelRequest,
    );
  }
}