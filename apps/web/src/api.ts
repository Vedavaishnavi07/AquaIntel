export async function api(path: string, options: RequestInit = {}) {
  const response = await fetch("/api" + path, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      "X-Aqua-Request": "1",
      ...options.headers,
    },
  });
  const data = await response
    .json()
    .catch(() => ({ error: "Server response could not be read" }));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
export const post = (path: string, data: unknown) =>
  api(path, { method: "POST", body: JSON.stringify(data) });
