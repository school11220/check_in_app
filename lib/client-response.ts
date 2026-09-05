export async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(response.ok ? fallbackMessage : `${fallbackMessage} (${response.status})`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${fallbackMessage}: the server returned an invalid response`);
  }
}
