export class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

/** Talk to the Genomap server. A body means POST; otherwise GET. */
export async function api(path, { body, signal } = {}) {
  let response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      signal,
      ...(body === undefined ? {} : {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }),
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new ApiError(0, "network");
  }
  const payload = await response.json().catch(() => null);
  if (response.ok) return payload;
  const code = payload?.error?.code ?? payload?.code ?? "unknown";
  throw new ApiError(response.status, String(code).toLowerCase());
}
