const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

interface AuthResponse {
  user: User
  accessToken: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// The access token only lives in memory (never in localStorage), so a script
// injected into the page can't steal a long-lived copy. The refresh token is in
// an httpOnly cookie the browser handles for us.
let accessToken: string | null = null
let refreshing: Promise<AuthResponse> | null = null

async function send<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('X-Requested-With', 'fetch')
  // JSON bodies are strings; file uploads (FormData) set their own type.
  if (typeof init.body === 'string') headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    })
  } catch {
    throw new ApiError('network', 0)
  }

  if (response.status === 204) return undefined as T
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = Array.isArray(body.message) ? body.message[0] : body.message
    throw new ApiError(message ?? '', response.status)
  }
  return body as T
}

// Turns an error into a message in the user's language. Screens pass their
// own text for the statuses they expect (e.g. 401 on login).
export function errorText(
  error: unknown,
  t: { network: string; tooMany: string; generic: string },
  byStatus: Partial<Record<number, string>> = {},
) {
  if (!(error instanceof ApiError)) return t.generic
  if (error.status === 0) return t.network
  if (error.status === 429) return t.tooMany
  return byStatus[error.status] ?? t.generic
}

function remember(auth: AuthResponse) {
  accessToken = auth.accessToken
  return auth.user
}

// Several requests can hit an expired token at once; they share one refresh
// so the single-use refresh token is only spent once.
export function refreshSession() {
  refreshing ??= send<AuthResponse>('/auth/refresh', { method: 'POST' }).finally(() => {
    refreshing = null
  })
  return refreshing.then(remember)
}

// Calls a protected route, refreshing the access token once if it expired.
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await send<T>(path, init)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    await refreshSession()
    return send<T>(path, init)
  }
}

// Like api(), but returns the raw response body for streamed answers.
export async function apiStream(path: string, body: unknown): Promise<ReadableStream<Uint8Array>> {
  const post = () =>
    fetch(`${API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'fetch',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify(body),
    })

  let response: Response
  try {
    response = await post()
    if (response.status === 401) {
      await refreshSession()
      response = await post()
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('network', 0)
  }
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(typeof data.message === 'string' ? data.message : '', response.status)
  }
  return response.body
}

export const auth = {
  register: (data: { name: string; email: string; password: string }) =>
    send<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }).then(remember),

  login: (data: { email: string; password: string }) =>
    send<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }).then(remember),

  logout: async () => {
    try {
      await send('/auth/logout', { method: 'POST' })
    } finally {
      accessToken = null
    }
  },
}
