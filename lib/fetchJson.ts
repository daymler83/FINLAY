const DEFAULT_TIMEOUT_MS = 8000

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function fetchJsonWithTimeout<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetchJson<T>(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timeout')
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
